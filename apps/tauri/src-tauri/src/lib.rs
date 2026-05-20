use std::path::Path;
use std::sync::Mutex;

use tauri::{Emitter, Manager, State};

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

struct PendingOpenFiles(Mutex<Vec<String>>);

#[tauri::command]
fn take_pending_open_files(state: State<'_, PendingOpenFiles>) -> Vec<String> {
    let mut guard = state.0.lock().unwrap();
    std::mem::take(&mut *guard)
}

/// Result variants for `set_as_default_markdown_handler`.
/// - `"set"`: we changed the default handler directly.
/// - `"opened-settings"`: we punted to the OS settings UI (Windows).
/// - `"unsupported"`: this platform has no in-app path.
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

#[cfg(target_os = "macos")]
fn set_default_markdown_handler_macos() -> Result<String, String> {
    use std::ffi::c_void;
    use std::os::raw::c_int;

    type CFAllocatorRef = *const c_void;
    type CFStringRef = *const c_void;
    type CFIndex = isize;
    type Boolean = u8;
    type CFStringCompareFlags = u32;

    const KCFSTRING_ENCODING_UTF8: u32 = 0x0800_0100;
    const KLS_ROLES_ALL: u32 = 0xFFFF_FFFF;
    const KCF_COMPARE_EQUAL: c_int = 0;

    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        fn CFStringCreateWithBytes(
            alloc: CFAllocatorRef,
            bytes: *const u8,
            num_bytes: CFIndex,
            encoding: u32,
            is_external_representation: Boolean,
        ) -> CFStringRef;
        fn CFStringCompare(
            the_string1: CFStringRef,
            the_string2: CFStringRef,
            compare_options: CFStringCompareFlags,
        ) -> c_int;
        fn CFRelease(cf: *const c_void);
    }

    #[link(name = "CoreServices", kind = "framework")]
    extern "C" {
        fn LSSetDefaultRoleHandlerForContentType(
            in_content_type: CFStringRef,
            in_role: u32,
            in_handler_bundle_id: CFStringRef,
        ) -> c_int;
        fn LSCopyDefaultRoleHandlerForContentType(
            in_content_type: CFStringRef,
            in_role: u32,
        ) -> CFStringRef;
    }

    fn make_cfstring(s: &str) -> CFStringRef {
        unsafe {
            CFStringCreateWithBytes(
                std::ptr::null(),
                s.as_ptr(),
                s.len() as CFIndex,
                KCFSTRING_ENCODING_UTF8,
                0,
            )
        }
    }

    // Returns true if MarkBricks is currently the default handler for `uti`.
    // SAFETY: caller must keep `uti` and `bundle_id` alive for the duration.
    unsafe fn current_default_matches(uti: CFStringRef, bundle_id: CFStringRef) -> bool {
        let current = LSCopyDefaultRoleHandlerForContentType(uti, KLS_ROLES_ALL);
        if current.is_null() {
            return false;
        }
        let equal = CFStringCompare(current, bundle_id, 0) == KCF_COMPARE_EQUAL;
        CFRelease(current);
        equal
    }

    let bundle_id = make_cfstring("com.markbricks.app");
    let uti = make_cfstring("net.daringfireball.markdown");
    if bundle_id.is_null() || uti.is_null() {
        if !bundle_id.is_null() {
            unsafe { CFRelease(bundle_id) };
        }
        if !uti.is_null() {
            unsafe { CFRelease(uti) };
        }
        return Err("Failed to create CFStrings".to_string());
    }

    // If we're already the default, calling Set is a no-op and no system
    // prompt would appear — short-circuit and report success.
    if unsafe { current_default_matches(uti, bundle_id) } {
        unsafe {
            CFRelease(uti);
            CFRelease(bundle_id);
        }
        return Ok("set".to_string());
    }

    let status = unsafe { LSSetDefaultRoleHandlerForContentType(uti, KLS_ROLES_ALL, bundle_id) };
    if status != 0 {
        unsafe {
            CFRelease(uti);
            CFRelease(bundle_id);
        }
        return Err(format!(
            "LSSetDefaultRoleHandlerForContentType failed (OSStatus {status})"
        ));
    }

    // On modern macOS (Sonoma+) the call above always returns success, but
    // the actual change is gated by a system confirmation prompt the user
    // can dismiss. Poll the live default for a few seconds to learn the
    // user's choice.
    let mut became_default = false;
    for _ in 0..20 {
        std::thread::sleep(std::time::Duration::from_millis(500));
        if unsafe { current_default_matches(uti, bundle_id) } {
            became_default = true;
            break;
        }
    }

    unsafe {
        CFRelease(uti);
        CFRelease(bundle_id);
    }

    if became_default {
        Ok("set".to_string())
    } else {
        Ok("declined".to_string())
    }
}

#[cfg(target_os = "windows")]
fn open_windows_default_apps_settings() -> Result<String, String> {
    use std::process::Command;
    // `cmd /c start "" <url>` is the canonical way to launch a shell URI
    // (ms-settings:) on Windows without inheriting handles or blocking.
    Command::new("cmd")
        .args(["/c", "start", "", "ms-settings:defaultapps"])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok("opened-settings".to_string())
}

fn is_markdown_path(s: &str) -> bool {
    if s.starts_with('-') {
        return false;
    }
    let p = Path::new(s);
    let Some(ext) = p.extension().and_then(|e| e.to_str()) else {
        return false;
    };
    matches!(ext.to_ascii_lowercase().as_str(), "md" | "markdown")
}

fn collect_markdown_paths<I, S>(args: I) -> Vec<String>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    args.into_iter()
        .skip(1)
        .filter_map(|s| {
            let s = s.as_ref();
            is_markdown_path(s).then(|| s.to_string())
        })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
            let paths = collect_markdown_paths(argv);
            if !paths.is_empty() {
                let _ = app.emit("open-files", paths);
            }
        }));
    }

    builder
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            write_text_file,
            read_text_file,
            take_pending_open_files,
            set_as_default_markdown_handler
        ])
        .setup(|app| {
            let initial = collect_markdown_paths(std::env::args());
            app.manage(PendingOpenFiles(Mutex::new(initial)));
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::Opened { urls } = event {
                let paths: Vec<String> = urls
                    .iter()
                    .filter_map(|u| u.to_file_path().ok())
                    .map(|p| p.to_string_lossy().to_string())
                    .collect();
                if paths.is_empty() {
                    return;
                }
                if let Some(state) = app.try_state::<PendingOpenFiles>() {
                    state.0.lock().unwrap().extend(paths.clone());
                }
                let _ = app.emit("open-files", paths);
            }
        });
}
