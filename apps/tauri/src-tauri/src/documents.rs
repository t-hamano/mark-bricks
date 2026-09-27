use std::collections::HashMap;
use std::fs::{File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

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
    pub contents: String,
}

struct Document {
    path: PathBuf,
    canonical_path: PathBuf,
    file: File,
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
        let file = if create {
            // Save targets need write access only; their contents are never read.
            // Never truncate before the selected file has been validated.
            match OpenOptions::new().write(true).open(&canonical_path) {
                Ok(file) => file,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => OpenOptions::new()
                    .write(true)
                    .create_new(true)
                    .open(&canonical_path)
                    .map_err(|e| e.to_string())?,
                Err(error) => return Err(error.to_string()),
            }
        } else {
            // Read-only documents can still be opened and saved under a new name.
            OpenOptions::new()
                .read(true)
                .write(true)
                .open(&canonical_path)
                .or_else(|_| File::open(&canonical_path))
                .map_err(|e| e.to_string())?
        };
        if !file.metadata().map_err(|e| e.to_string())?.is_file() {
            return Err("The selected path is not a regular file".into());
        }
        let document = Self {
            path: path.to_path_buf(),
            canonical_path,
            file,
        };
        document.validate_identity()?;
        Ok(document)
    }

    fn validate_identity(&self) -> Result<(), String> {
        let current_path = self.path.canonicalize().map_err(|e| e.to_string())?;
        #[cfg(unix)]
        let same_file = {
            use std::os::unix::fs::MetadataExt;

            // same_file::Handle::from_path opens for reading on Unix. Compare
            // metadata instead so write-only targets can still be validated.
            // The retained handle keeps the selected inode alive during comparison.
            let selected = self.file.metadata().map_err(|e| e.to_string())?;
            let current = std::fs::metadata(&current_path).map_err(|e| e.to_string())?;
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
                options.open(&current_path).map_err(|e| e.to_string())?,
            )
            .map_err(|e| e.to_string())?;
            selected == current
        };
        if current_path != self.canonical_path || !same_file {
            return Err("The file has been replaced. Reopen it or use Save As.".into());
        }
        Ok(())
    }

    fn read(&mut self) -> Result<String, String> {
        self.validate_identity()?;
        self.file.rewind().map_err(|e| e.to_string())?;
        let mut contents = String::new();
        self.file
            .read_to_string(&mut contents)
            .map_err(|e| e.to_string())?;
        Ok(contents)
    }

    fn write(&mut self, contents: &str) -> Result<(), String> {
        self.validate_identity()?;
        self.file
            .seek(SeekFrom::Start(0))
            .map_err(|e| e.to_string())?;
        self.file
            .write_all(contents.as_bytes())
            .map_err(|e| e.to_string())?;
        self.file
            .set_len(contents.len() as u64)
            .map_err(|e| e.to_string())?;
        self.file.sync_data().map_err(|e| e.to_string())
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
        let mut document = Document::open(path, false)?;
        let contents = document.read()?;
        Ok(OpenedDocument {
            info: self.register(document),
            contents,
        })
    }

    fn save_selected(&mut self, path: &Path, contents: &str) -> Result<DocumentInfo, String> {
        let mut document = Document::open(path, true)?;
        document.write(contents)?;
        Ok(self.register(document))
    }

    fn write(&mut self, id: &str, contents: &str) -> Result<(), String> {
        self.documents
            .get_mut(id)
            .ok_or("Unknown or closed document")?
            .write(contents)
    }

    fn close(&mut self, id: &str) {
        self.documents.remove(id);
    }
}

pub type Documents = Mutex<DocumentRegistry>;

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
pub fn write_document(
    state: State<'_, Documents>,
    document_id: String,
    contents: String,
) -> Result<(), String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .write(&document_id, &contents)
}

#[tauri::command]
pub fn close_document(state: State<'_, Documents>, document_id: String) -> Result<(), String> {
    state.lock().map_err(|e| e.to_string())?.close(&document_id);
    Ok(())
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

    #[test]
    fn only_registered_documents_can_be_written() {
        let dir = TestDirectory::new();
        let path = dir.file("selected.md", "original contents");
        let other = dir.file("unselected.md", "private");
        let mut registry = DocumentRegistry::default();
        assert!(registry.write(other.to_str().unwrap(), "attacker").is_err());
        assert!(registry.write("document-1", "attacker").is_err());
        let opened = registry.open_selected(&path).unwrap();
        assert_eq!(opened.contents, "original contents");
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
    fn replacing_a_path_cannot_redirect_a_save() {
        let dir = TestDirectory::new();
        let path = dir.file("selected.md", "original");
        let other = dir.file("private.md", "private");
        let mut registry = DocumentRegistry::default();
        let opened = registry.open_selected(&path).unwrap();
        let moved = dir.0.join("moved.md");
        std::fs::rename(&path, &moved).unwrap();
        std::fs::hard_link(&other, &path).unwrap();
        assert!(registry
            .write(&opened.info.document_id, "attacker")
            .is_err());
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
        assert!(registry
            .write(&opened.info.document_id, "attacker")
            .is_err());
        assert_eq!(std::fs::read_to_string(other).unwrap(), "private");
    }
}
