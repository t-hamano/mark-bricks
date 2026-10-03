use std::path::{Path, PathBuf};

use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::DialogExt;

/// Sent to the main window once a PDF export starts, after the dialog, since
/// it takes a few seconds.
const EXPORTING_EVENT: &str = "slide-deck-exporting";

/// What to export, in the format the user chose before the dialog: the save
/// dialogs on Linux keep the file name's extension when the user picks
/// another filter, so the name cannot tell the format.
#[derive(serde::Deserialize)]
#[serde(tag = "format", rename_all = "lowercase")]
pub enum ExportRequest {
    /// The page to write.
    Html { html: String },
    /// The deck to print.
    Pdf { markdown: String },
}

impl ExportRequest {
    fn extension(&self) -> &'static str {
        match self {
            ExportRequest::Html { .. } => "html",
            ExportRequest::Pdf { .. } => "pdf",
        }
    }
}

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

/// Asks where to export a slide deck, and writes it there in the requested
/// format. The frontend never names the path to write: `document_path` only
/// seeds the dialog and resolves the deck's relative images. Returns the
/// written file's name, or `None` when the user cancels.
#[tauri::command]
pub async fn export_slide_deck(
    app: AppHandle,
    request: ExportRequest,
    document_path: Option<String>,
    filter_name: String,
) -> Result<Option<String>, String> {
    let extension = request.extension();
    let dialog_app = app.clone();
    let dialog_document_path = document_path.clone();
    let path = tauri::async_runtime::spawn_blocking(move || {
        let app = dialog_app;
        let (file_name, directory) =
            suggested_file(dialog_document_path.as_deref().map(Path::new), extension);
        let mut dialog = app
            .dialog()
            .file()
            .add_filter(filter_name, &[extension])
            .set_file_name(file_name);
        if let Some(directory) = directory {
            dialog = dialog.set_directory(directory);
        }
        if let Some(window) = app.get_webview_window("main") {
            dialog = dialog.set_parent(&window);
        }
        dialog
            .blocking_save_file()
            .map(|path| path.into_path().map_err(|e| e.to_string()))
            .transpose()
    })
    .await
    .map_err(|e| e.to_string())??;
    let Some(path) = path else {
        return Ok(None);
    };

    match request {
        ExportRequest::Html { html } => {
            std::fs::write(&path, html).map_err(|e| e.to_string())?;
        }
        ExportRequest::Pdf { markdown } => {
            let _ = app.emit_to("main", EXPORTING_EVENT, ());
            crate::pdf::export_pdf(&app, markdown, document_path, &path).await?;
        }
    }
    Ok(Some(
        path.file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_default(),
    ))
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
    fn reads_the_format_the_user_chose() {
        let request: ExportRequest =
            serde_json::from_str(r#"{"format":"pdf","markdown":"Deck"}"#).unwrap();
        assert_eq!(request.extension(), "pdf");
        assert!(matches!(request, ExportRequest::Pdf { markdown } if markdown == "Deck"));
        let request: ExportRequest =
            serde_json::from_str(r#"{"format":"html","html":"<html>"}"#).unwrap();
        assert_eq!(request.extension(), "html");
    }

    #[test]
    fn keeps_dots_in_the_document_name() {
        let (file_name, _) = suggested_file(Some(Path::new("v1.2.md")), "html");
        assert_eq!(file_name, "v1.2.html");
    }
}
