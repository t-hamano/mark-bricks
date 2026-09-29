use std::collections::HashMap;
use std::fs::{File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentInfo {
    pub document_id: String,
    pub path: String,
}

#[derive(Serialize)]
pub struct OpenedDocument {
    #[serde(flatten)]
    pub info: DocumentInfo,
    pub contents: Option<String>,
}

#[derive(Debug, PartialEq, Serialize)]
#[serde(tag = "code", content = "message", rename_all = "snake_case")]
pub enum WriteError {
    SaveAsRequired,
    Other(String),
}

impl WriteError {
    fn from_path_error(error: std::io::Error) -> Self {
        if error.kind() == std::io::ErrorKind::NotFound {
            Self::SaveAsRequired
        } else {
            Self::Other(error.to_string())
        }
    }
}

impl From<String> for WriteError {
    fn from(message: String) -> Self {
        Self::Other(message)
    }
}

impl From<WriteError> for String {
    fn from(error: WriteError) -> Self {
        match error {
            WriteError::SaveAsRequired => {
                "The file is missing or has been replaced. Use Save As.".into()
            }
            WriteError::Other(message) => message,
        }
    }
}

struct Document {
    path: PathBuf,
    canonical_path: PathBuf,
    file: File,
    writable: bool,
    readable: bool,
    references: usize,
    #[cfg(test)]
    after_sync: Option<Box<dyn FnOnce() + Send>>,
}

impl Document {
    // Only native dialog results and OS open requests may reach this function.
    // Keep the handle: a later path/symlink replacement must never redirect a save.
    fn open(path: &Path, create: bool) -> Result<Self, String> {
        let canonical_path = match path.canonicalize() {
            Ok(path) => path,
            Err(error) if create && error.kind() == std::io::ErrorKind::NotFound => {
                let parent = path.parent().ok_or("Missing parent directory")?;
                parent
                    .canonicalize()
                    .map_err(|e| e.to_string())?
                    .join(path.file_name().ok_or("Missing file name")?)
            }
            Err(error) => return Err(error.to_string()),
        };
        let (file, writable) = if create {
            // Save targets need write access only; their contents are never read.
            // Never truncate before the selected file has been validated.
            let file = match OpenOptions::new().write(true).open(&canonical_path) {
                Ok(file) => file,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => OpenOptions::new()
                    .write(true)
                    .create_new(true)
                    .open(&canonical_path)
                    .map_err(|e| e.to_string())?,
                Err(error) => return Err(error.to_string()),
            };
            (file, true)
        } else {
            // Read-only documents can still be opened and saved under a new name.
            match OpenOptions::new()
                .read(true)
                .write(true)
                .open(&canonical_path)
            {
                Ok(file) => (file, true),
                Err(_) => (
                    File::open(&canonical_path).map_err(|e| e.to_string())?,
                    false,
                ),
            }
        };
        if !file.metadata().map_err(|e| e.to_string())?.is_file() {
            return Err("The selected path is not a regular file".into());
        }
        let document = Self {
            path: path.to_path_buf(),
            canonical_path,
            file,
            writable,
            readable: !create,
            references: 1,
            #[cfg(test)]
            after_sync: None,
        };
        document.validate_identity()?;
        Ok(document)
    }

    fn validate_identity(&self) -> Result<(), WriteError> {
        // Report a stable code so the frontend never depends on OS error text.
        let current_path = self
            .path
            .canonicalize()
            .map_err(WriteError::from_path_error)?;
        #[cfg(unix)]
        let same_file = {
            use std::os::unix::fs::MetadataExt;

            // same_file::Handle::from_path opens for reading on Unix. Compare
            // metadata instead so write-only targets can still be validated.
            // The retained handle keeps the selected inode alive during comparison.
            let selected = self.file.metadata().map_err(|e| e.to_string())?;
            let current = std::fs::metadata(&current_path).map_err(WriteError::from_path_error)?;
            (selected.dev(), selected.ino()) == (current.dev(), current.ino())
        };
        #[cfg(not(unix))]
        let same_file = {
            let selected =
                same_file::Handle::from_file(self.file.try_clone().map_err(|e| e.to_string())?)
                    .map_err(|e| e.to_string())?;
            let mut options = OpenOptions::new();
            #[cfg(windows)]
            {
                use std::os::windows::fs::OpenOptionsExt;

                // Query identity without requesting permission to read file data.
                options.access_mode(0);
            }
            #[cfg(not(windows))]
            options.read(true);
            let current = same_file::Handle::from_file(
                options
                    .open(&current_path)
                    .map_err(WriteError::from_path_error)?,
            )
            .map_err(|e| e.to_string())?;
            selected == current
        };
        if current_path != self.canonical_path || !same_file {
            return Err(WriteError::SaveAsRequired);
        }
        Ok(())
    }

    fn read(&mut self) -> Result<String, String> {
        self.validate_identity()?;
        // Save As retains a write-only handle. If its tab closed during a
        // duplicate open, acquire read access without redirecting the grant.
        let mut file = if self.readable {
            self.file.try_clone().map_err(|e| e.to_string())?
        } else {
            let file = File::open(&self.canonical_path).map_err(|e| e.to_string())?;
            let selected =
                same_file::Handle::from_file(self.file.try_clone().map_err(|e| e.to_string())?)
                    .map_err(|e| e.to_string())?;
            let current =
                same_file::Handle::from_file(file.try_clone().map_err(|e| e.to_string())?)
                    .map_err(|e| e.to_string())?;
            if selected != current {
                return Err(WriteError::SaveAsRequired.into());
            }
            file
        };
        file.rewind().map_err(|e| e.to_string())?;
        let mut contents = String::new();
        file.read_to_string(&mut contents)
            .map_err(|e| e.to_string())?;
        self.validate_identity()?;
        Ok(contents)
    }

    fn write(&mut self, contents: &str) -> Result<(), WriteError> {
        self.validate_identity()?;
        if !self.writable {
            // Permissions or sharing locks may have changed since opening.
            // Do not truncate or create anything before checking the new handle.
            let file = OpenOptions::new()
                .write(true)
                .open(&self.canonical_path)
                .map_err(WriteError::from_path_error)?;
            let selected =
                same_file::Handle::from_file(self.file.try_clone().map_err(|e| e.to_string())?)
                    .map_err(|e| e.to_string())?;
            let current =
                same_file::Handle::from_file(file.try_clone().map_err(|e| e.to_string())?)
                    .map_err(|e| e.to_string())?;
            if selected != current {
                return Err(WriteError::SaveAsRequired);
            }
            self.validate_identity()?;
            self.file = file;
            self.writable = true;
            self.readable = false;
        }
        self.file
            .seek(SeekFrom::Start(0))
            .map_err(|e| e.to_string())?;
        self.file
            .write_all(contents.as_bytes())
            .map_err(|e| e.to_string())?;
        self.file
            .set_len(contents.len() as u64)
            .map_err(|e| e.to_string())?;
        self.file.sync_data().map_err(|e| e.to_string())?;
        #[cfg(test)]
        if let Some(after_sync) = self.after_sync.take() {
            after_sync();
        }
        // Another application may replace the path while the retained handle is
        // being written. Only report success if that path still names our file.
        self.validate_identity()
    }
}

#[derive(Default)]
pub struct DocumentRegistry {
    next_id: u64,
    documents: HashMap<String, Document>,
}

impl DocumentRegistry {
    fn register(&mut self, document: Document) -> DocumentInfo {
        self.next_id += 1;
        let document_id = format!("document-{}", self.next_id);
        let info = DocumentInfo {
            document_id: document_id.clone(),
            path: document.path.to_string_lossy().into_owned(),
        };
        self.documents.insert(document_id, document);
        info
    }

    pub fn open_selected(&mut self, path: &Path) -> Result<OpenedDocument, String> {
        // Focus an existing tab without reopening or rereading its file. Retain
        // a reference so an in-flight tab close cannot revoke this open request.
        if let Some((id, document)) = self.documents.iter_mut().find(|(_, d)| d.path == path) {
            document.references += 1;
            return Ok(OpenedDocument {
                info: DocumentInfo {
                    document_id: id.clone(),
                    path: document.path.to_string_lossy().into_owned(),
                },
                contents: None,
            });
        }
        let mut document = Document::open(path, false)?;
        let contents = document.read()?;
        Ok(OpenedDocument {
            info: self.register(document),
            contents: Some(contents),
        })
    }

    /// The paths of the given open documents, in order, skipping unknown IDs.
    pub fn paths(&self, ids: &[String]) -> Vec<PathBuf> {
        ids.iter()
            .filter_map(|id| self.documents.get(id))
            .map(|document| document.path.clone())
            .collect()
    }

    fn read(&mut self, id: &str) -> Result<String, String> {
        self.documents
            .get_mut(id)
            .ok_or_else(|| "Unknown or closed document".to_string())?
            .read()
    }

    fn save_selected(&mut self, path: &Path, contents: &str) -> Result<DocumentInfo, String> {
        let mut document = Document::open(path, true)?;
        document.write(contents)?;
        Ok(self.register(document))
    }

    fn write(&mut self, id: &str, contents: &str) -> Result<(), WriteError> {
        self.documents
            .get_mut(id)
            .ok_or_else(|| "Unknown or closed document".to_string())?
            .write(contents)
    }

    fn close(&mut self, id: &str) {
        if let Some(document) = self.documents.get_mut(id) {
            document.references -= 1;
            if document.references == 0 {
                self.documents.remove(id);
            }
        }
    }
}

pub type Documents = Arc<Mutex<DocumentRegistry>>;

#[tauri::command]
pub async fn read_document(
    state: State<'_, Documents>,
    document_id: String,
) -> Result<String, String> {
    with_documents(state.inner().clone(), move |registry| {
        registry.read(&document_id)
    })
    .await
}

/// Keep file I/O and registry lock waits off the event and async executor threads.
pub async fn with_documents<T, E>(
    documents: Documents,
    operation: impl FnOnce(&mut DocumentRegistry) -> Result<T, E> + Send + 'static,
) -> Result<T, E>
where
    T: Send + 'static,
    E: From<String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(move || {
        let mut registry = documents.lock().map_err(|e| E::from(e.to_string()))?;
        operation(&mut registry)
    })
    .await
    .map_err(|e| E::from(e.to_string()))?
}

#[tauri::command]
pub async fn open_document(app: AppHandle) -> Result<Option<OpenedDocument>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut dialog = app
            .dialog()
            .file()
            .add_filter("Markdown", &["md", "markdown"]);
        if let Some(window) = app.get_webview_window("main") {
            dialog = dialog.set_parent(&window);
        }
        let Some(path) = dialog.blocking_pick_file() else {
            return Ok(None);
        };
        let path = path.into_path().map_err(|e| e.to_string())?;
        let state = app.state::<Documents>();
        let result = state
            .lock()
            .map_err(|e| e.to_string())?
            .open_selected(&path);
        result.map(Some)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn save_document_as(
    app: AppHandle,
    contents: String,
) -> Result<Option<DocumentInfo>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut dialog = app
            .dialog()
            .file()
            .add_filter("Markdown", &["md", "markdown"]);
        if let Some(window) = app.get_webview_window("main") {
            dialog = dialog.set_parent(&window);
        }
        let Some(path) = dialog.blocking_save_file() else {
            return Ok(None);
        };
        let path = path.into_path().map_err(|e| e.to_string())?;
        let state = app.state::<Documents>();
        let result = state
            .lock()
            .map_err(|e| e.to_string())?
            .save_selected(&path, &contents);
        result.map(Some)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn write_document(
    state: State<'_, Documents>,
    document_id: String,
    contents: String,
) -> Result<(), WriteError> {
    with_documents(state.inner().clone(), move |registry| {
        registry.write(&document_id, &contents)
    })
    .await
}

#[tauri::command]
pub async fn close_document(
    state: State<'_, Documents>,
    document_id: String,
) -> Result<(), String> {
    with_documents(state.inner().clone(), move |registry| {
        registry.close(&document_id);
        Ok(())
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TestDirectory(PathBuf);

    impl TestDirectory {
        fn new() -> Self {
            let unique = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let path = std::env::temp_dir().join(format!(
                "mark-bricks-documents-{}-{unique}",
                std::process::id()
            ));
            std::fs::create_dir(&path).unwrap();
            Self(path)
        }

        fn file(&self, name: &str, contents: &str) -> PathBuf {
            let path = self.0.join(name);
            std::fs::write(&path, contents).unwrap();
            path
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            assert_eq!(self.0.parent(), Some(std::env::temp_dir().as_path()));
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    fn make_read_only(path: &Path) -> std::fs::Permissions {
        let original = std::fs::metadata(path).unwrap().permissions();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o400)).unwrap();
        }
        #[cfg(not(unix))]
        {
            let mut permissions = original.clone();
            permissions.set_readonly(true);
            std::fs::set_permissions(path, permissions).unwrap();
        }
        assert!(
            OpenOptions::new().write(true).open(path).is_err(),
            "This test requires read-only permissions to be enforced"
        );
        original
    }

    #[test]
    fn replacement_during_a_save_requires_save_as() {
        for replace in [false, true] {
            let dir = TestDirectory::new();
            let path = dir.file("selected.md", "original");
            let replacement = dir.file("replacement.md", "external contents");
            let moved = dir.0.join("moved.md");
            let mut document = Document::open(&path, false).unwrap();
            let selected = path.clone();
            let old = moved.clone();
            // Deterministically simulate an external rename/replacement during
            // the write, after data reaches the handle but before success.
            document.after_sync = Some(Box::new(move || {
                std::fs::rename(&selected, &old).unwrap();
                if replace {
                    std::fs::rename(&replacement, &selected).unwrap();
                }
            }));
            assert_eq!(document.write("edited"), Err(WriteError::SaveAsRequired));
            assert_eq!(std::fs::read_to_string(moved).unwrap(), "edited");
            if replace {
                assert_eq!(std::fs::read_to_string(path).unwrap(), "external contents");
            } else {
                assert!(!path.exists());
            }
        }
    }

    #[test]
    fn duplicate_opens_do_not_touch_the_path_and_keep_independent_references() {
        let dir = TestDirectory::new();
        let path = dir.file("selected.md", "original");
        let moved = dir.0.join("moved.md");
        let mut registry = DocumentRegistry::default();
        let first = registry.open_selected(&path).unwrap();
        std::fs::rename(&path, &moved).unwrap();
        let duplicate = registry.open_selected(&path).unwrap();
        assert_eq!(first.info.document_id, duplicate.info.document_id);
        assert!(duplicate.contents.is_none());
        registry.close(&first.info.document_id);
        std::fs::rename(&moved, &path).unwrap();
        assert_eq!(
            registry.read(&duplicate.info.document_id).unwrap(),
            "original"
        );
        registry
            .write(&duplicate.info.document_id, "edited")
            .unwrap();
        registry.close(&duplicate.info.document_id);
        assert!(registry.read(&duplicate.info.document_id).is_err());
        assert!(registry
            .write(&duplicate.info.document_id, "denied")
            .is_err());
        assert!(registry.read(path.to_str().unwrap()).is_err());
        assert_eq!(std::fs::read_to_string(path).unwrap(), "edited");
    }

    #[test]
    fn duplicate_open_can_read_after_a_save_as_tab_closes() {
        let dir = TestDirectory::new();
        let path = dir.0.join("saved.md");
        let mut registry = DocumentRegistry::default();
        let saved = registry.save_selected(&path, "saved contents").unwrap();
        let duplicate = registry.open_selected(&path).unwrap();
        assert!(duplicate.contents.is_none());
        registry.close(&saved.document_id);
        assert_eq!(
            registry.read(&duplicate.info.document_id).unwrap(),
            "saved contents"
        );
        registry.close(&duplicate.info.document_id);
        assert!(registry.read(&duplicate.info.document_id).is_err());
    }

    #[cfg(unix)]
    #[test]
    fn duplicate_open_does_not_require_read_permission() {
        use std::os::unix::fs::PermissionsExt;

        let dir = TestDirectory::new();
        let path = dir.file("selected.md", "original");
        let mut registry = DocumentRegistry::default();
        let first = registry.open_selected(&path).unwrap();
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o000)).unwrap();
        assert!(File::open(&path).is_err(), "Run as an unprivileged user");
        let duplicate = registry.open_selected(&path).unwrap();
        assert_eq!(first.info.document_id, duplicate.info.document_id);
        assert!(duplicate.contents.is_none());
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600)).unwrap();
    }

    #[test]
    fn read_only_documents_can_be_saved_after_permissions_change() {
        let dir = TestDirectory::new();
        let path = dir.file("selected.md", "original");
        let permissions = make_read_only(&path);
        let mut registry = DocumentRegistry::default();
        let opened = registry.open_selected(&path).unwrap();
        assert!(!registry.documents[&opened.info.document_id].writable);
        assert!(matches!(
            registry.write(&opened.info.document_id, "denied"),
            Err(WriteError::Other(_))
        ));
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "original");

        std::fs::set_permissions(&path, permissions).unwrap();
        registry.write(&opened.info.document_id, "edited").unwrap();
        registry.write(&opened.info.document_id, "short").unwrap();
        assert_eq!(std::fs::read_to_string(path).unwrap(), "short");
    }

    #[test]
    fn upgrading_read_only_access_rejects_replaced_files() {
        let dir = TestDirectory::new();
        let path = dir.file("selected.md", "original");
        let other = dir.file("private.md", "private");
        let permissions = make_read_only(&path);
        let mut registry = DocumentRegistry::default();
        let opened = registry.open_selected(&path).unwrap();
        std::fs::set_permissions(&path, permissions).unwrap();
        let moved = dir.0.join("moved.md");
        std::fs::rename(&path, &moved).unwrap();
        std::fs::hard_link(&other, &path).unwrap();
        assert_eq!(
            registry.write(&opened.info.document_id, "attacker"),
            Err(WriteError::SaveAsRequired)
        );
        assert_eq!(std::fs::read_to_string(other).unwrap(), "private");
        assert_eq!(std::fs::read_to_string(moved).unwrap(), "original");
    }

    #[test]
    fn registry_lock_wait_and_file_io_do_not_block_the_caller() {
        use std::future::Future;
        use std::sync::mpsc;
        use std::task::{Context, Poll, Waker};
        use std::time::Duration;

        let dir = TestDirectory::new();
        let path = dir.file("selected.md", "original");
        let task_path = path.clone();
        let documents = Documents::default();
        let locked = documents.lock().unwrap();
        let worker_documents = documents.clone();
        let (sender, receiver) = mpsc::channel();
        let caller = std::thread::spawn(move || {
            let caller_id = std::thread::current().id();
            let mut task = Box::pin(with_documents::<_, String>(
                worker_documents,
                move |registry| {
                    assert_ne!(std::thread::current().id(), caller_id);
                    registry.save_selected(&task_path, "saved")?;
                    Ok(())
                },
            ));
            let poll = task.as_mut().poll(&mut Context::from_waker(Waker::noop()));
            sender.send(matches!(poll, Poll::Pending)).unwrap();
            if poll.is_pending() {
                tauri::async_runtime::block_on(task).unwrap();
            }
        });
        // A synchronous lock wait would prevent the first poll from returning.
        let yielded = receiver.recv_timeout(Duration::from_secs(5));
        drop(locked);
        caller.join().unwrap();
        assert!(yielded.unwrap());
        assert_eq!(std::fs::read_to_string(path).unwrap(), "saved");
    }

    #[test]
    fn only_registered_documents_can_be_written() {
        let dir = TestDirectory::new();
        let path = dir.file("selected.md", "original contents");
        let other = dir.file("unselected.md", "private");
        let mut registry = DocumentRegistry::default();
        assert!(registry.write(other.to_str().unwrap(), "attacker").is_err());
        assert!(registry.write("document-1", "attacker").is_err());
        let opened = registry.open_selected(&path).unwrap();
        assert_eq!(opened.contents.as_deref(), Some("original contents"));
        registry.write(&opened.info.document_id, "short").unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "short");
        assert_eq!(std::fs::read_to_string(other).unwrap(), "private");
    }

    #[test]
    fn closing_revokes_access_and_ids_are_not_reused() {
        let dir = TestDirectory::new();
        let path = dir.file("selected.md", "original");
        let mut registry = DocumentRegistry::default();
        let first = registry.open_selected(&path).unwrap().info.document_id;
        registry.close(&first);
        let second = registry.open_selected(&path).unwrap().info.document_id;
        assert_ne!(first, second);
        assert!(registry.write(&first, "attacker").is_err());
        assert_eq!(std::fs::read_to_string(path).unwrap(), "original");
    }

    #[test]
    fn save_as_registers_exact_selected_file() {
        let dir = TestDirectory::new();
        let path = dir.0.join("new.md");
        let mut registry = DocumentRegistry::default();
        let saved = registry.save_selected(&path, "new document").unwrap();
        registry.write(&saved.document_id, "edited").unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "edited");
        let overwrite = registry.save_selected(&path, "x").unwrap();
        assert_ne!(saved.document_id, overwrite.document_id);
        assert_eq!(std::fs::read_to_string(path).unwrap(), "x");
    }

    #[test]
    fn invalid_files_do_not_grant_access() {
        let dir = TestDirectory::new();
        let mut registry = DocumentRegistry::default();
        assert!(registry.open_selected(&dir.0.join("missing.md")).is_err());
        assert!(registry.open_selected(&dir.0).is_err());
        let binary = dir.0.join("binary.md");
        std::fs::write(&binary, [0xff, 0xfe]).unwrap();
        assert!(registry.open_selected(&binary).is_err());
        assert!(registry.documents.is_empty());
    }

    #[cfg(unix)]
    #[test]
    fn save_as_and_later_saves_accept_write_only_files() {
        use std::os::unix::fs::PermissionsExt;

        let dir = TestDirectory::new();
        let path = dir.file("write-only.md", "original contents");
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o200)).unwrap();
        // Check the precondition so a privileged test run cannot hide a regression.
        assert_eq!(
            File::open(&path)
                .expect_err("This test requires an unprivileged user")
                .kind(),
            std::io::ErrorKind::PermissionDenied
        );

        let mut registry = DocumentRegistry::default();
        let saved = registry.save_selected(&path, "saved").unwrap();
        registry.write(&saved.document_id, "short").unwrap();
        assert_eq!(
            std::fs::metadata(&path).unwrap().permissions().mode() & 0o777,
            0o200
        );

        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600)).unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "short");
    }

    #[cfg(windows)]
    #[test]
    fn save_as_and_later_saves_accept_write_only_acl() {
        let dir = TestDirectory::new();
        let path = dir.file("write-only.md", "original contents");
        let set_acl = |args: &[&str]| {
            let output = std::process::Command::new("icacls")
                .arg(&path)
                .args(args)
                .output()
                .unwrap();
            assert!(output.status.success(), "icacls failed: {output:?}");
        };
        // Deny data reads on this temporary file, preserving metadata and writes.
        set_acl(&["/deny", "*S-1-1-0:(RD)"]);
        assert_eq!(
            File::open(&path).unwrap_err().kind(),
            std::io::ErrorKind::PermissionDenied
        );

        let mut registry = DocumentRegistry::default();
        let saved = registry.save_selected(&path, "saved").unwrap();
        registry.write(&saved.document_id, "short").unwrap();
        assert!(File::open(&path).is_err());

        set_acl(&["/remove:d", "*S-1-1-0"]);
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "short");
    }

    #[test]
    fn missing_paths_require_save_as_without_writing_the_old_handle() {
        for remove in [false, true] {
            let dir = TestDirectory::new();
            let path = dir.file("selected.md", "original");
            let mut registry = DocumentRegistry::default();
            let opened = registry.open_selected(&path).unwrap();
            let moved = dir.0.join("moved.md");
            if remove {
                std::fs::remove_file(&path).unwrap();
            } else {
                std::fs::rename(&path, &moved).unwrap();
            }
            assert_eq!(
                registry.write(&opened.info.document_id, "unsaved edits"),
                Err(WriteError::SaveAsRequired)
            );
            assert!(!path.exists());
            if !remove {
                assert_eq!(std::fs::read_to_string(moved).unwrap(), "original");
            }
        }
    }

    #[test]
    fn save_as_errors_have_a_stable_ipc_code() {
        assert_eq!(
            serde_json::to_value(WriteError::SaveAsRequired).unwrap(),
            serde_json::json!({ "code": "save_as_required" })
        );
        assert!(matches!(
            WriteError::from_path_error(std::io::ErrorKind::PermissionDenied.into()),
            WriteError::Other(_)
        ));
    }

    #[test]
    fn replacing_a_path_cannot_redirect_a_save() {
        let dir = TestDirectory::new();
        let path = dir.file("selected.md", "original");
        let other = dir.file("private.md", "private");
        let mut registry = DocumentRegistry::default();
        let opened = registry.open_selected(&path).unwrap();
        let moved = dir.0.join("moved.md");
        std::fs::rename(&path, &moved).unwrap();
        std::fs::hard_link(&other, &path).unwrap();
        assert_eq!(
            registry.write(&opened.info.document_id, "attacker"),
            Err(WriteError::SaveAsRequired)
        );
        assert_eq!(std::fs::read_to_string(&other).unwrap(), "private");
        assert_eq!(std::fs::read_to_string(&moved).unwrap(), "original");
    }

    #[cfg(unix)]
    #[test]
    fn replacing_a_symlink_cannot_redirect_a_save() {
        let dir = TestDirectory::new();
        let target = dir.file("selected.md", "original");
        let other = dir.file("private.md", "private");
        let link = dir.0.join("link.md");
        std::os::unix::fs::symlink(&target, &link).unwrap();
        let mut registry = DocumentRegistry::default();
        let opened = registry.open_selected(&link).unwrap();
        std::fs::remove_file(&link).unwrap();
        std::os::unix::fs::symlink(&other, &link).unwrap();
        assert_eq!(
            registry.write(&opened.info.document_id, "attacker"),
            Err(WriteError::SaveAsRequired)
        );
        assert_eq!(std::fs::read_to_string(other).unwrap(), "private");
    }
}
