use std::collections::{HashMap, HashSet};
use std::fs::{File, OpenOptions};
use std::hash::{DefaultHasher, Hash, Hasher};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use notify_debouncer_mini::notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, Debouncer};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
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
    ChangedOnDisk,
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
            WriteError::ChangedOnDisk => {
                "The file changed on disk. Reload it or keep your version first.".into()
            }
            WriteError::Other(message) => message,
        }
    }
}

/// An outside change to an open document's file, sent to the frontend as the
/// `document-changed` event. `contents` is `None` when the file was deleted
/// or moved away. Saves are rejected until the frontend acknowledges the
/// change's `revision`.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentChange {
    pub document_id: String,
    pub revision: u64,
    pub contents: Option<String>,
}

fn hash_contents(contents: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    contents.hash(&mut hasher);
    hasher.finish()
}

struct Document {
    path: PathBuf,
    canonical_path: PathBuf,
    file: File,
    writable: bool,
    readable: bool,
    references: usize,
    /// Hash of the contents last read from or written to the file, so the
    /// watcher skips our own saves and changes that leave the contents as is.
    contents_hash: Option<u64>,
    /// Whether the watcher has reported the file as deleted or moved away.
    missing: bool,
    /// Counts the changes reported to the frontend.
    revision: u64,
    /// Whether the frontend has yet to acknowledge the last reported change.
    /// Saves wait for it, so a save requested before the user saw the change
    /// cannot overwrite it.
    unacknowledged: bool,
    #[cfg(test)]
    after_sync: Option<Box<dyn FnOnce() + Send>>,
}

impl Document {
    // Only native dialog results, OS open requests, and reloads of a path one
    // of those already opened (`rebind`) may reach this function.
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
            contents_hash: None,
            missing: false,
            revision: 0,
            unacknowledged: false,
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
        self.contents_hash = Some(hash_contents(&contents));
        Ok(contents)
    }

    fn write(&mut self, contents: &str) -> Result<(), WriteError> {
        if self.unacknowledged {
            return Err(WriteError::ChangedOnDisk);
        }
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
        self.validate_identity()?;
        self.contents_hash = Some(hash_contents(contents));
        self.missing = false;
        Ok(())
    }

    /// Rereads the file after the watcher saw a change in its directory.
    /// Returns `Some(Some(contents))` when the contents changed, and
    /// `Some(None)` when the file was deleted or moved away.
    fn refresh(&mut self) -> Option<Option<String>> {
        match self.validate_identity() {
            Ok(()) => {
                let previous = self.contents_hash;
                let was_missing = std::mem::take(&mut self.missing);
                let contents = self.read().ok()?;
                // A file moved back is reported even when unchanged, so its tab
                // can drop the unsaved state the move gave it.
                (was_missing || self.contents_hash != previous).then_some(Some(contents))
            }
            Err(WriteError::SaveAsRequired) => self.rebind(),
            Err(_) => None,
        }
    }

    /// Binds the document to the file now at its path, for applications that
    /// save by replacing the file. Only the path the user opened is reopened,
    /// and only while it still resolves to the same place, so neither a new
    /// path nor a retargeted symlink can redirect a later save.
    fn rebind(&mut self) -> Option<Option<String>> {
        let replacement = Document::open(&self.path, false)
            .ok()
            .filter(|document| document.canonical_path == self.canonical_path);
        let Some(mut replacement) = replacement else {
            if self.missing {
                return None;
            }
            self.missing = true;
            return Some(None);
        };
        let contents = replacement.read().ok()?;
        let changed = self.missing || replacement.contents_hash != self.contents_hash;
        self.file = replacement.file;
        self.writable = replacement.writable;
        self.readable = replacement.readable;
        self.contents_hash = replacement.contents_hash;
        self.missing = false;
        changed.then_some(Some(contents))
    }
}

/// Watches the directories of the open documents. Directories rather than
/// files, so saves that replace a file by renaming another over it are seen.
pub struct DocumentWatcher {
    debouncer: Debouncer<RecommendedWatcher>,
    directories: HashSet<PathBuf>,
}

impl DocumentWatcher {
    fn sync(&mut self, directories: HashSet<PathBuf>) {
        let debouncer = &mut self.debouncer;
        self.directories.retain(|directory| {
            directories.contains(directory) || {
                let _ = debouncer.watcher().unwatch(directory);
                false
            }
        });
        // Record only the watches that succeeded, so a directory the OS
        // refused (e.g. at its watch limit) is retried on the next sync.
        for directory in directories {
            if !self.directories.contains(&directory)
                && debouncer
                    .watcher()
                    .watch(&directory, RecursiveMode::NonRecursive)
                    .is_ok()
            {
                self.directories.insert(directory);
            }
        }
    }
}

/// Starts watching open documents and emits `document-changed` to the main
/// window when one changes on disk.
pub fn watch_documents(app: &AppHandle) -> Result<(), String> {
    let documents = app.state::<Documents>().inner().clone();
    let app = app.clone();
    start_watcher(&documents, move |change| {
        let _ = app.emit_to("main", "document-changed", change);
    })
}

fn start_watcher(
    documents: &Documents,
    on_change: impl Fn(DocumentChange) + Send + 'static,
) -> Result<(), String> {
    let weak = Arc::downgrade(documents);
    // One save can emit several events; handle them once they settle.
    let debouncer = new_debouncer(
        Duration::from_millis(300),
        move |result: DebounceEventResult| {
            let (Ok(events), Some(documents)) = (result, weak.upgrade()) else {
                return;
            };
            let paths: Vec<PathBuf> = events.into_iter().map(|event| event.path).collect();
            let Ok(changes) = documents
                .lock()
                .map(|mut registry| registry.refresh(&paths))
            else {
                return;
            };
            changes.into_iter().for_each(&on_change);
        },
    )
    .map_err(|e| e.to_string())?;
    let mut registry = documents.lock().map_err(|e| e.to_string())?;
    registry.watcher = Some(DocumentWatcher {
        debouncer,
        directories: HashSet::new(),
    });
    registry.sync_watcher();
    Ok(())
}

#[derive(Default)]
pub struct DocumentRegistry {
    next_id: u64,
    documents: HashMap<String, Document>,
    watcher: Option<DocumentWatcher>,
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
        self.sync_watcher();
        info
    }

    /// Watches exactly the directories that hold open documents.
    fn sync_watcher(&mut self) {
        if let Some(watcher) = &mut self.watcher {
            watcher.sync(
                self.documents
                    .values()
                    .filter_map(|document| document.canonical_path.parent())
                    .map(Path::to_path_buf)
                    .collect(),
            );
        }
    }

    /// Rereads the documents in the directories of the changed `paths`.
    fn refresh(&mut self, paths: &[PathBuf]) -> Vec<DocumentChange> {
        let directories: HashSet<&Path> = paths
            .iter()
            .flat_map(|path| [Some(path.as_path()), path.parent()])
            .flatten()
            .collect();
        self.documents
            .iter_mut()
            .filter(|(_, document)| {
                document
                    .canonical_path
                    .parent()
                    .is_some_and(|directory| directories.contains(directory))
            })
            .filter_map(|(id, document)| {
                let contents = document.refresh()?;
                document.revision += 1;
                document.unacknowledged = true;
                Some(DocumentChange {
                    document_id: id.clone(),
                    revision: document.revision,
                    contents,
                })
            })
            .collect()
    }

    /// Lets saves through again once the frontend has handled the change
    /// `revision`. Acknowledging an older change keeps a newer one pending.
    fn acknowledge(&mut self, id: &str, revision: u64) {
        if let Some(document) = self.documents.get_mut(id) {
            if document.revision == revision {
                document.unacknowledged = false;
            }
        }
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
                self.sync_watcher();
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
pub async fn acknowledge_document_change(
    state: State<'_, Documents>,
    document_id: String,
    revision: u64,
) -> Result<(), String> {
    with_documents(state.inner().clone(), move |registry| {
        registry.acknowledge(&document_id, revision);
        Ok(())
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

    fn changes(registry: &mut DocumentRegistry, path: &Path) -> Vec<(String, Option<String>)> {
        // The watcher reports paths in the canonical directories it watches.
        let directory = path.parent().unwrap().canonicalize().unwrap();
        registry
            .refresh(&[directory.join(path.file_name().unwrap())])
            .into_iter()
            .map(|change| (change.document_id, change.contents))
            .collect()
    }

    /// Acknowledges the last change reported for `id`, as the frontend does.
    fn acknowledge(registry: &mut DocumentRegistry, id: &str) {
        let revision = registry.documents[id].revision;
        registry.acknowledge(id, revision);
    }

    #[test]
    fn saves_wait_until_the_latest_change_is_acknowledged() {
        let dir = TestDirectory::new();
        let path = dir.file("selected.md", "original");
        let mut registry = DocumentRegistry::default();
        let id = registry.open_selected(&path).unwrap().info.document_id;
        let temporary = dir.file("selected.md.tmp", "replaced");
        std::fs::rename(&temporary, &path).unwrap();
        assert_eq!(changes(&mut registry, &path).len(), 1);
        // A save requested before the user saw the change cannot overwrite it.
        assert_eq!(registry.write(&id, "stale"), Err(WriteError::ChangedOnDisk));
        std::fs::write(&path, "again").unwrap();
        assert_eq!(changes(&mut registry, &path).len(), 1);
        registry.acknowledge(&id, 1);
        assert_eq!(registry.write(&id, "stale"), Err(WriteError::ChangedOnDisk));
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "again");
        registry.acknowledge(&id, 2);
        registry.write(&id, "kept").unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "kept");
    }

    #[test]
    fn own_saves_and_unchanged_contents_are_not_reported() {
        let dir = TestDirectory::new();
        let path = dir.file("selected.md", "original");
        let mut registry = DocumentRegistry::default();
        let id = registry.open_selected(&path).unwrap().info.document_id;
        assert!(changes(&mut registry, &path).is_empty());
        registry.write(&id, "edited").unwrap();
        assert!(changes(&mut registry, &path).is_empty());
        std::fs::write(&path, "edited").unwrap();
        assert!(changes(&mut registry, &path).is_empty());
    }

    #[test]
    fn changes_in_place_are_reported_once() {
        let dir = TestDirectory::new();
        let path = dir.file("selected.md", "original");
        let other = dir.file("other.md", "other");
        let mut registry = DocumentRegistry::default();
        let id = registry.open_selected(&path).unwrap().info.document_id;
        std::fs::write(&path, "outside").unwrap();
        assert_eq!(
            changes(&mut registry, &other),
            [(id.clone(), Some("outside".into()))]
        );
        assert!(changes(&mut registry, &path).is_empty());
        let unrelated = TestDirectory::new();
        std::fs::write(&path, "again").unwrap();
        assert!(changes(&mut registry, &unrelated.file("other.md", "")).is_empty());
    }

    #[test]
    fn replaced_files_are_reloaded_and_saved_in_place() {
        let dir = TestDirectory::new();
        let path = dir.file("selected.md", "original");
        let mut registry = DocumentRegistry::default();
        let id = registry.open_selected(&path).unwrap().info.document_id;
        // Save the way many editors do: write a temporary file, then rename it.
        let temporary = dir.file("selected.md.tmp", "replaced");
        std::fs::rename(&temporary, &path).unwrap();
        assert_eq!(
            changes(&mut registry, &path),
            [(id.clone(), Some("replaced".into()))]
        );
        acknowledge(&mut registry, &id);
        registry.write(&id, "edited").unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "edited");
        // An identical replacement rebinds without reporting a change.
        let temporary = dir.file("selected.md.tmp", "edited");
        std::fs::rename(&temporary, &path).unwrap();
        assert!(changes(&mut registry, &path).is_empty());
        registry.write(&id, "short").unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "short");
    }

    #[test]
    fn deleted_files_are_reported_once_and_require_save_as() {
        let dir = TestDirectory::new();
        let path = dir.file("selected.md", "original");
        let mut registry = DocumentRegistry::default();
        let id = registry.open_selected(&path).unwrap().info.document_id;
        std::fs::remove_file(&path).unwrap();
        assert_eq!(changes(&mut registry, &path), [(id.clone(), None)]);
        assert!(changes(&mut registry, &path).is_empty());
        acknowledge(&mut registry, &id);
        assert_eq!(
            registry.write(&id, "unsaved edits"),
            Err(WriteError::SaveAsRequired)
        );
        assert!(!path.exists());
        // A file restored at the path is reported even with the old contents.
        std::fs::write(&path, "original").unwrap();
        assert_eq!(
            changes(&mut registry, &path),
            [(id.clone(), Some("original".into()))]
        );
        acknowledge(&mut registry, &id);
        registry.write(&id, "edited").unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "edited");
    }

    #[test]
    fn directories_that_cannot_be_watched_are_retried() {
        let dir = TestDirectory::new();
        let later = dir.0.join("later");
        let mut watcher = DocumentWatcher {
            debouncer: new_debouncer(Duration::from_millis(300), |_| {}).unwrap(),
            directories: HashSet::new(),
        };
        watcher.sync(HashSet::from([later.clone()]));
        assert!(watcher.directories.is_empty());
        std::fs::create_dir(&later).unwrap();
        watcher.sync(HashSet::from([later.clone()]));
        assert_eq!(watcher.directories, HashSet::from([later]));
        watcher.sync(HashSet::new());
        assert!(watcher.directories.is_empty());
    }

    #[test]
    fn the_watcher_reports_changes_until_the_document_closes() {
        use std::sync::mpsc;

        let dir = TestDirectory::new();
        let path = dir.file("selected.md", "original");
        let documents = Documents::default();
        let (sender, receiver) = mpsc::channel();
        start_watcher(&documents, move |change| {
            let _ = sender.send((change.document_id, change.contents));
        })
        .unwrap();
        let id = documents
            .lock()
            .unwrap()
            .open_selected(&path)
            .unwrap()
            .info
            .document_id;
        let next = || receiver.recv_timeout(Duration::from_secs(10)).unwrap();

        let temporary = dir.file("selected.md.tmp", "replaced");
        std::fs::rename(&temporary, &path).unwrap();
        assert_eq!(next(), (id.clone(), Some("replaced".into())));
        let mut registry = documents.lock().unwrap();
        acknowledge(&mut registry, &id);
        registry.write(&id, "saved").unwrap();
        drop(registry);
        std::fs::remove_file(&path).unwrap();
        // Our own save is skipped, so the deletion is the next change.
        assert_eq!(next(), (id.clone(), None));

        documents.lock().unwrap().close(&id);
        assert!(documents
            .lock()
            .unwrap()
            .watcher
            .as_ref()
            .unwrap()
            .directories
            .is_empty());
        std::fs::write(&path, "after closing").unwrap();
        assert!(receiver.recv_timeout(Duration::from_secs(1)).is_err());
    }

    #[cfg(unix)]
    #[test]
    fn retargeted_symlinks_are_not_reloaded() {
        let dir = TestDirectory::new();
        let target = dir.file("selected.md", "original");
        let other = dir.file("private.md", "private");
        let link = dir.0.join("link.md");
        std::os::unix::fs::symlink(&target, &link).unwrap();
        let mut registry = DocumentRegistry::default();
        let id = registry.open_selected(&link).unwrap().info.document_id;
        std::fs::remove_file(&target).unwrap();
        std::fs::remove_file(&link).unwrap();
        std::os::unix::fs::symlink(&other, &link).unwrap();
        assert_eq!(changes(&mut registry, &target), [(id.clone(), None)]);
        assert_eq!(
            registry.write(&id, "attacker"),
            Err(WriteError::SaveAsRequired)
        );
        assert_eq!(std::fs::read_to_string(other).unwrap(), "private");
    }

    #[test]
    fn save_as_errors_have_a_stable_ipc_code() {
        assert_eq!(
            serde_json::to_value(WriteError::SaveAsRequired).unwrap(),
            serde_json::json!({ "code": "save_as_required" })
        );
        assert_eq!(
            serde_json::to_value(WriteError::ChangedOnDisk).unwrap(),
            serde_json::json!({ "code": "changed_on_disk" })
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
