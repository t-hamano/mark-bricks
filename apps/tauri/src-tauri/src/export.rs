use std::path::{Path, PathBuf};

use tauri::{AppHandle, Emitter, Manager};

/// Sent to the main window once a PDF export starts, after the dialog, since
/// it takes a few seconds.
const EXPORTING_EVENT: &str = "slide-deck-exporting";
use tauri_plugin_dialog::DialogExt;

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

/// Whether the user chose to export a PDF, by the file's extension. Any other
/// name gets the HTML, as with Marp CLI.
fn is_pdf(path: &Path) -> bool {
    path.extension()
        .is_some_and(|extension| extension.eq_ignore_ascii_case("pdf"))
}

/// Asks where to export a slide deck, and writes it there: `html` for an
/// HTML file, or `markdown` printed to a PDF. The frontend never names the
/// path to write: `document_path` only seeds the dialog and resolves the
/// deck's relative images. Returns the written file's name, or `None` when
/// the user cancels.
#[tauri::command]
pub async fn export_slide_deck(
    app: AppHandle,
    html: String,
    markdown: String,
    document_path: Option<String>,
    html_filter: String,
    pdf_filter: String,
) -> Result<Option<String>, String> {
    let dialog_app = app.clone();
    let dialog_document_path = document_path.clone();
    let path = tauri::async_runtime::spawn_blocking(move || {
        let app = dialog_app;
        let (file_name, directory) =
            suggested_file(dialog_document_path.as_deref().map(Path::new), "html");
        let mut dialog = app
            .dialog()
            .file()
            .add_filter(html_filter, &["html"])
            .add_filter(pdf_filter, &["pdf"])
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

    if is_pdf(&path) {
        let _ = app.emit_to("main", EXPORTING_EVENT, ());
        crate::pdf::export_pdf(&app, markdown, document_path, &path).await?;
    } else {
        std::fs::write(&path, html).map_err(|e| e.to_string())?;
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
    fn exports_a_pdf_only_for_a_pdf_file_name() {
        assert!(is_pdf(Path::new("deck.pdf")));
        assert!(is_pdf(Path::new("deck.PDF")));
        assert!(!is_pdf(Path::new("deck.html")));
        assert!(!is_pdf(Path::new("deck")));
    }

    #[test]
    fn keeps_dots_in_the_document_name() {
        let (file_name, _) = suggested_file(Some(Path::new("v1.2.md")), "html");
        assert_eq!(file_name, "v1.2.html");
    }
}
