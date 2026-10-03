use std::ffi::OsString;
use std::path::{Component, Path, PathBuf};
use std::sync::{Mutex, OnceLock};

use tauri::{Emitter, Env, Manager};

mod documents;
use documents::{
    close_document, open_document, read_document, save_document_as, with_documents, write_document,
    Documents, OpenedDocument,
};

/// Markdown files the OS asked us to open before the app window was ready to
/// receive them — for example when opening a file starts the app, or a second
/// launch passes its file to the first. We hold them in a simple shared place
/// because they can arrive before startup finishes, when the usual storage is
/// not ready yet and they would otherwise be lost.
fn pending_open_files() -> &'static Mutex<Vec<PathBuf>> {
    static PENDING: OnceLock<Mutex<Vec<PathBuf>>> = OnceLock::new();
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
async fn take_pending_documents(
    state: tauri::State<'_, Documents>,
) -> Result<Vec<OpenRequestResult>, String> {
    with_documents(state.inner().clone(), |documents| {
        let paths = std::mem::take(&mut *pending_open_files().lock().map_err(|e| e.to_string())?);
        Ok(paths
            .into_iter()
            .map(|path| {
                let document = documents.open_selected(&path).ok();
                OpenRequestResult {
                    path: path.to_string_lossy().into_owned(),
                    document,
                }
            })
            .collect())
    })
    .await
}

/// Prints that `path` rendered, and how its code block previews rendered, for
/// the smoke test (`MARK_BRICKS_SMOKE_TEST`).
#[tauri::command]
fn report_rendered(path: String, previews: serde_json::Value) {
    if std::env::var_os("MARK_BRICKS_SMOKE_TEST").is_some() {
        println!("[smoke] previews: {previews}");
        println!("[smoke] rendered: {path}");
    }
}

/// Label of the slide preview window.
const PREVIEW_WINDOW: &str = "preview";

/// Opens the slide preview window, or brings it to the front when it is
/// already open. The window shows its controls in `locale`, the WordPress
/// locale slug the main window applied. Async because creating a window from
/// a synchronous command deadlocks on Windows.
#[tauri::command]
async fn open_preview(app: tauri::AppHandle, title: String, locale: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(PREVIEW_WINDOW) {
        let _ = window.unminimize();
        return window.set_focus().map_err(|e| e.to_string());
    }
    tauri::WebviewWindowBuilder::new(
        &app,
        PREVIEW_WINDOW,
        tauri::WebviewUrl::App(format!("preview.html?locale={locale}").into()),
    )
    .title(title)
    .inner_size(960.0, 540.0)
    .min_inner_size(320.0, 180.0)
    .build()
    .map(|_| ())
    .map_err(|e| e.to_string())
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

/// The arguments to relaunch this process with, e.g. after an update: the
/// launch arguments without their Markdown paths.
///
/// On Windows the updater hands them to the NSIS installer, which mangles
/// paths on the way (a path with a space splits into pieces that then resolve
/// against the install directory), and on macOS files opened from Finder never
/// appear in them at all. The open documents come back through
/// [`RELAUNCH_DOCUMENTS_FILE`] instead.
fn relaunch_args(args: Vec<OsString>) -> Vec<OsString> {
    let mut args = args.into_iter();
    args.next()
        .into_iter()
        .chain(args.filter(|arg| !arg.to_str().is_some_and(is_markdown_path)))
        .collect()
}

/// File in the app's local data directory that carries the open documents'
/// paths across a relaunch after an update.
const RELAUNCH_DOCUMENTS_FILE: &str = "relaunch-documents.json";

/// A path in the OS's own encoding, so a Unix file name that is not valid
/// UTF-8 survives the relaunch unchanged.
#[cfg(unix)]
type NativePath = Vec<u8>;
#[cfg(windows)]
type NativePath = Vec<u16>;

#[cfg(unix)]
fn encode_path(path: &Path) -> NativePath {
    use std::os::unix::ffi::OsStrExt;
    path.as_os_str().as_bytes().to_vec()
}

#[cfg(windows)]
fn encode_path(path: &Path) -> NativePath {
    use std::os::windows::ffi::OsStrExt;
    path.as_os_str().encode_wide().collect()
}

#[cfg(unix)]
fn decode_path(path: NativePath) -> PathBuf {
    use std::os::unix::ffi::OsStringExt;
    PathBuf::from(OsString::from_vec(path))
}

#[cfg(windows)]
fn decode_path(path: NativePath) -> PathBuf {
    use std::os::windows::ffi::OsStringExt;
    PathBuf::from(OsString::from_wide(&path))
}

fn write_relaunch_documents(file: &Path, paths: &[PathBuf]) -> Result<(), String> {
    if paths.is_empty() {
        return match std::fs::remove_file(file) {
            Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e.to_string()),
            _ => Ok(()),
        };
    }
    if let Some(dir) = file.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let native: Vec<NativePath> = paths.iter().map(|path| encode_path(path)).collect();
    let json = serde_json::to_string(&native).map_err(|e| e.to_string())?;
    std::fs::write(file, json).map_err(|e| e.to_string())
}

/// Reads and removes the paths saved by [`write_relaunch_documents`], so they
/// are restored on the next launch only. When the file cannot be removed,
/// nothing is restored, since the same paths would otherwise reopen on every
/// later launch.
fn take_relaunch_documents(file: &Path) -> Vec<PathBuf> {
    take_relaunch_documents_with(file, |file| std::fs::remove_file(file))
}

/// [`take_relaunch_documents`] with the removal passed in, so a test can make
/// it fail regardless of the user's file permissions.
fn take_relaunch_documents_with(
    file: &Path,
    remove: impl FnOnce(&Path) -> std::io::Result<()>,
) -> Vec<PathBuf> {
    let Ok(json) = std::fs::read_to_string(file) else {
        return Vec::new();
    };
    if remove(file).is_err() {
        return Vec::new();
    }
    serde_json::from_str::<Vec<NativePath>>(&json)
        .map(|paths| paths.into_iter().map(decode_path).collect())
        .unwrap_or_default()
}

fn relaunch_documents_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map(|dir| dir.join(RELAUNCH_DOCUMENTS_FILE))
        .map_err(|e| e.to_string())
}

/// Saves the paths of the given open documents, in order, to reopen after the
/// relaunch that follows an update. Only documents the user already opened
/// can be saved; an empty list clears any saved paths.
#[tauri::command]
async fn remember_documents_for_relaunch(
    app: tauri::AppHandle,
    state: tauri::State<'_, Documents>,
    document_ids: Vec<String>,
) -> Result<(), String> {
    let file = relaunch_documents_file(&app)?;
    with_documents(state.inner().clone(), move |documents| {
        write_relaunch_documents(&file, &documents.paths(&document_ids))
    })
    .await
}

pub fn run() {
    let ctx = tauri::generate_context!();

    // Seed this instance's own argv-provided files before the event loop;
    // the single-instance callback may fire before `setup` would have run.
    pending_open_files().lock().unwrap().extend(
        collect_markdown_paths(
            std::env::args(),
            &std::env::current_dir().unwrap_or_default(),
        )
        .into_iter()
        .map(PathBuf::from),
    );

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
            pending_open_files()
                .lock()
                .unwrap()
                .extend(paths.into_iter().map(PathBuf::from));
            let _ = app.emit("open-files", ());
        }
    }));

    builder
        .setup(|app| {
            // Documents open before an update come first, ahead of any files
            // this launch was given.
            if let Ok(file) = relaunch_documents_file(app.handle()) {
                pending_open_files()
                    .lock()
                    .unwrap()
                    .splice(0..0, take_relaunch_documents(&file));
            }
            // The updater and `relaunch()` restart the app with `Env`'s
            // arguments. Nothing borrows `Env` yet during setup, so replacing
            // it cannot leave a dangling reference.
            let mut env = app.env();
            env.args_os = relaunch_args(env.args_os);
            #[allow(deprecated)]
            app.unmanage::<Env>();
            app.manage(env);
            Ok(())
        })
        .on_window_event(|window, event| {
            // The preview belongs to the main window, so it closes with it.
            // `Destroyed` fires only once the close guard has let the main
            // window go.
            if window.label() == "main" && matches!(event, tauri::WindowEvent::Destroyed) {
                if let Some(preview) = window.app_handle().get_webview_window(PREVIEW_WINDOW) {
                    let _ = preview.destroy();
                }
            }
        })
        .manage(Documents::default())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_document,
            open_document,
            save_document_as,
            write_document,
            close_document,
            take_pending_documents,
            report_rendered,
            open_preview,
            remember_documents_for_relaunch,
            set_as_default_markdown_handler
        ])
        .build(ctx)
        .expect("error while building tauri application")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = event {
                let paths: Vec<PathBuf> =
                    urls.iter().filter_map(|u| u.to_file_path().ok()).collect();
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
