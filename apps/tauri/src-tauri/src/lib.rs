use std::path::{Component, Path, PathBuf};
use std::sync::{Mutex, OnceLock};

use tauri::{Emitter, Manager};

mod documents;
use documents::{
    close_document, open_document, save_document_as, write_document, Documents, OpenedDocument,
};

/// Markdown files the OS asked us to open before the app window was ready to
/// receive them — for example when opening a file starts the app, or a second
/// launch passes its file to the first. We hold them in a simple shared place
/// because they can arrive before startup finishes, when the usual storage is
/// not ready yet and they would otherwise be lost.
fn pending_open_files() -> &'static Mutex<Vec<String>> {
    static PENDING: OnceLock<Mutex<Vec<String>>> = OnceLock::new();
    PENDING.get_or_init(|| Mutex::new(Vec::new()))
}

#[derive(serde::Serialize)]
struct OpenRequestResult {
    path: String,
    document: Option<OpenedDocument>,
}

/// Only OS-supplied paths enter this queue. IPC callers cannot add paths or
/// turn a forged frontend event into permission to read another file.
#[tauri::command]
fn take_pending_documents(
    state: tauri::State<'_, Documents>,
) -> Result<Vec<OpenRequestResult>, String> {
    let paths = std::mem::take(&mut *pending_open_files().lock().map_err(|e| e.to_string())?);
    let mut documents = state.lock().map_err(|e| e.to_string())?;
    Ok(paths
        .into_iter()
        .map(|path| {
            let document = documents.open_selected(Path::new(&path)).ok();
            OpenRequestResult { path, document }
        })
        .collect())
}

/// Prints that `path` rendered, for the smoke test (`MARK_BRICKS_SMOKE_TEST`).
#[tauri::command]
fn report_rendered(path: String) {
    if std::env::var_os("MARK_BRICKS_SMOKE_TEST").is_some() {
        println!("[smoke] rendered: {path}");
    }
}

/// Result variants for `set_as_default_markdown_handler`.
/// - `"set"`: we changed the default handler directly.
/// - `"declined"`: the user dismissed the macOS confirmation.
/// - `"unsupported"`: this platform has no in-app path.
/// - `"idle"`: we opened the OS settings (Windows); no outcome to report.
#[tauri::command]
fn set_as_default_markdown_handler() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        set_default_markdown_handler_macos()
    }
    #[cfg(target_os = "windows")]
    {
        open_windows_default_apps_settings()
    }
    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    {
        Ok("unsupported".to_string())
    }
}

/// Asks macOS to make MarkBricks the default app for Markdown files.
///
/// Returns `"set"` if it is (or becomes) the default. On modern macOS the
/// change is gated by a system prompt, so this waits a few seconds for the
/// user's choice and returns `"declined"` if they dismiss it.
#[cfg(target_os = "macos")]
fn set_default_markdown_handler_macos() -> Result<String, String> {
    use core_foundation::base::TCFType;
    use core_foundation::string::{CFString, CFStringRef};

    const KLS_ROLES_ALL: u32 = 0xFFFF_FFFF;

    // The two LaunchServices calls have no maintained crate, so keep them as a
    // minimal FFI block; `core-foundation` handles the strings and memory.
    #[link(name = "CoreServices", kind = "framework")]
    extern "C" {
        fn LSSetDefaultRoleHandlerForContentType(
            content_type: CFStringRef,
            role: u32,
            handler_bundle_id: CFStringRef,
        ) -> i32;
        fn LSCopyDefaultRoleHandlerForContentType(
            content_type: CFStringRef,
            role: u32,
        ) -> CFStringRef;
    }

    let bundle_id = CFString::new("com.markbricks.app");
    let uti = CFString::new("net.daringfireball.markdown");

    // Whether MarkBricks is the current default handler for the UTI.
    let is_default = || {
        let current = unsafe {
            LSCopyDefaultRoleHandlerForContentType(uti.as_concrete_TypeRef(), KLS_ROLES_ALL)
        };
        if current.is_null() {
            return false;
        }
        // `LSCopy…` follows the Create Rule, so wrap it to release on drop.
        let current = unsafe { CFString::wrap_under_create_rule(current) };
        current.to_string() == bundle_id.to_string()
    };

    // If we're already the default, Set is a no-op and shows no prompt.
    if is_default() {
        return Ok("set".to_string());
    }

    let status = unsafe {
        LSSetDefaultRoleHandlerForContentType(
            uti.as_concrete_TypeRef(),
            KLS_ROLES_ALL,
            bundle_id.as_concrete_TypeRef(),
        )
    };
    if status != 0 {
        return Err(format!(
            "LSSetDefaultRoleHandlerForContentType failed (OSStatus {status})"
        ));
    }

    // On modern macOS the call above succeeds immediately, but the real change
    // is gated by a system prompt the user can dismiss. Poll the live default
    // for a few seconds to learn their choice.
    for _ in 0..20 {
        std::thread::sleep(std::time::Duration::from_millis(500));
        if is_default() {
            return Ok("set".to_string());
        }
    }

    Ok("declined".to_string())
}

/// Opens the Windows "Default apps" settings for the user to choose.
#[cfg(target_os = "windows")]
fn open_windows_default_apps_settings() -> Result<String, String> {
    use std::process::Command;
    Command::new("cmd")
        .args(["/c", "start", "", "ms-settings:defaultapps"])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok("idle".to_string())
}

const MARKDOWN_EXTENSIONS: [&str; 2] = ["md", "markdown"];

/// Whether `s` looks like a Markdown file, judged by its file extension against
/// [`MARKDOWN_EXTENSIONS`] (compared case-insensitively).
fn is_markdown_path(s: &str) -> bool {
    // Arguments starting with "-" are command-line flags, not file paths.
    if s.starts_with('-') {
        return false;
    }
    let Some(ext) = Path::new(s).extension().and_then(|e| e.to_str()) else {
        return false;
    };
    let ext = ext.to_ascii_lowercase();
    MARKDOWN_EXTENSIONS.contains(&ext.as_str())
}

/// Joins `path` onto `cwd` unless it is already absolute, and drops `.` and
/// `..` segments without touching the file system. The frontend resolves
/// relative image paths against the document's folder, so it needs an
/// absolute document path.
fn absolutize(path: &str, cwd: &Path) -> String {
    let mut out = PathBuf::new();
    for component in cwd.join(path).components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                out.pop();
            }
            other => out.push(other),
        }
    }
    out.to_string_lossy().to_string()
}

/// Picks the Markdown file paths out of the process arguments, skipping the
/// first entry (the program's own path), and makes them absolute against
/// `cwd`, the directory the arguments were given in.
fn collect_markdown_paths<I, S>(args: I, cwd: &Path) -> Vec<String>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    args.into_iter()
        .skip(1)
        .filter_map(|s| {
            let s = s.as_ref();
            is_markdown_path(s).then(|| absolutize(s, cwd))
        })
        .collect()
}

pub fn run() {
    let ctx = tauri::generate_context!();

    // Seed this instance's own argv-provided files before the event loop;
    // the single-instance callback may fire before `setup` would have run.
    pending_open_files()
        .lock()
        .unwrap()
        .extend(collect_markdown_paths(
            std::env::args(),
            &std::env::current_dir().unwrap_or_default(),
        ));

    let mut builder = tauri::Builder::default();

    builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.set_focus();
        }
        // Relative to the second launch's directory, not this instance's.
        let paths = collect_markdown_paths(argv, Path::new(&cwd));
        if !paths.is_empty() {
            // Buffer *before* emitting: a still-cold-starting frontend
            // hasn't attached its `open-files` listener yet, so a bare
            // emit would be dropped. The buffer lets it drain these via
            // `take_pending_documents`. Events only signal that the native
            // queue has new requests; their payload cannot authorize paths.
            pending_open_files().lock().unwrap().extend(paths);
            let _ = app.emit("open-files", ());
        }
    }));

    builder
        .manage(Documents::default())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_document,
            save_document_as,
            write_document,
            close_document,
            take_pending_documents,
            report_rendered,
            set_as_default_markdown_handler
        ])
        .build(ctx)
        .expect("error while building tauri application")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = event {
                let paths: Vec<String> = urls
                    .iter()
                    .filter_map(|u| u.to_file_path().ok())
                    .map(|p| p.to_string_lossy().to_string())
                    .collect();
                if paths.is_empty() {
                    return;
                }
                pending_open_files().lock().unwrap().extend(paths);
                let _ = app.emit("open-files", ());
            }

            #[cfg(not(target_os = "macos"))]
            let _ = (app, event);
        });
}

#[cfg(test)]
mod tests;
