use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

/// The files this session exported, which the frontend may open. The
/// frontend never names a path to write, and can open no other file.
#[derive(Default)]
pub struct Exports(Mutex<HashSet<PathBuf>>);

/// The name and folder the save dialog suggests: the document's own name with
/// `extension`, next to it, or "untitled" for an unsaved document.
fn suggested_file(document_path: Option<&Path>, extension: &str) -> (String, Option<PathBuf>) {
    let stem = document_path
        .and_then(Path::file_stem)
        .map(|stem| stem.to_string_lossy().into_owned())
        .unwrap_or_else(|| "untitled".to_string());
    let directory = document_path
        .and_then(Path::parent)
        .filter(|parent| !parent.as_os_str().is_empty())
        .map(Path::to_path_buf);
    (format!("{stem}.{extension}"), directory)
}

/// Asks where to export a slide deck, and writes `html` there. `document_path`
/// only seeds the dialog. Returns the chosen path, or `None` when the user
/// cancels.
#[tauri::command]
pub async fn export_slide_deck(
    app: AppHandle,
    html: String,
    document_path: Option<String>,
    filter_name: String,
) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let (file_name, directory) =
            suggested_file(document_path.as_deref().map(Path::new), "html");
        let mut dialog = app
            .dialog()
            .file()
            .add_filter(filter_name, &["html"])
            .set_file_name(file_name);
        if let Some(directory) = directory {
            dialog = dialog.set_directory(directory);
        }
        if let Some(window) = app.get_webview_window("main") {
            dialog = dialog.set_parent(&window);
        }
        let Some(path) = dialog.blocking_save_file() else {
            return Ok(None);
        };
        let path = path.into_path().map_err(|e| e.to_string())?;
        std::fs::write(&path, html).map_err(|e| e.to_string())?;
        app.state::<Exports>()
            .0
            .lock()
            .map_err(|e| e.to_string())?
            .insert(path.clone());
        Ok(Some(path.to_string_lossy().into_owned()))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Opens a file `export_slide_deck` wrote, in its default app.
#[tauri::command]
pub fn open_exported_file(
    app: AppHandle,
    exports: State<'_, Exports>,
    path: String,
) -> Result<(), String> {
    if !exports
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .contains(Path::new(&path))
    {
        return Err("The file was not exported in this session.".to_string());
    }
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn suggests_the_document_name_next_to_it() {
        let document = Path::new("docs").join("deck.md");
        assert_eq!(
            suggested_file(Some(&document), "html"),
            ("deck.html".to_string(), Some(PathBuf::from("docs")))
        );
    }

    #[test]
    fn suggests_untitled_for_an_unsaved_document() {
        assert_eq!(
            suggested_file(None, "html"),
            ("untitled.html".to_string(), None)
        );
    }

    #[test]
    fn keeps_dots_in_the_document_name() {
        let (file_name, _) = suggested_file(Some(Path::new("v1.2.md")), "html");
        assert_eq!(file_name, "v1.2.html");
    }
}
