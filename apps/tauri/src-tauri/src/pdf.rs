use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use lopdf::{Dictionary, Document, Object, StringFormat};
use tauri::{AppHandle, Emitter, Listener, Manager, WebviewUrl, WebviewWindow};

/// Label of the hidden window that prints a slide deck to PDF.
pub const EXPORT_WINDOW: &str = "export";

// The events between the export window and this module, as in
// `src/export/main.ts`.
const READY_EVENT: &str = "export-ready";
const DECK_EVENT: &str = "export-deck";
const RENDERED_EVENT: &str = "export-rendered";

/// How long each step may take before the export gives up.
const STEP_TIMEOUT: Duration = Duration::from_secs(60);

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Deck {
    markdown: String,
    document_path: Option<String>,
}

/// What the export window reports once the slides have loaded: the page size
/// in CSS pixels and the PDF's metadata, or why the deck did not render.
#[derive(serde::Deserialize, Debug, Default, PartialEq)]
struct Layout {
    width: f64,
    height: f64,
    title: Option<String>,
    description: Option<String>,
    author: Option<String>,
    keywords: Option<Vec<String>>,
}

#[derive(serde::Deserialize)]
#[serde(untagged)]
enum Rendered {
    Failed { error: String },
    Done(Layout),
}

/// Prints a step of the export for the smoke test, which shows where an
/// export stops on each OS.
fn trace(step: &str) {
    if std::env::var_os("MARK_BRICKS_SMOKE_TEST").is_some() {
        eprintln!("[smoke] pdf step: {step}");
    }
}

/// Whether a PDF export is running. There is one export window, so a second
/// export would tear down the first one's.
static EXPORTING: AtomicBool = AtomicBool::new(false);

/// Marks a PDF export as running until it drops.
struct ExportGuard;

impl ExportGuard {
    fn acquire() -> Result<Self, String> {
        if EXPORTING.swap(true, Ordering::SeqCst) {
            return Err("Another slide deck is being exported to PDF.".to_string());
        }
        Ok(ExportGuard)
    }
}

impl Drop for ExportGuard {
    fn drop(&mut self) {
        EXPORTING.store(false, Ordering::SeqCst);
    }
}

/// Called once with the result of printing.
type Done = Box<dyn FnOnce(Result<(), String>) + Send>;

/// Renders a Marp slide deck in a hidden window and prints it to a PDF at
/// `path`: one page per slide, at the slide's size, with the deck's metadata.
pub async fn export_pdf(
    app: &AppHandle,
    markdown: String,
    document_path: Option<String>,
    path: &Path,
) -> Result<(), String> {
    let _guard = ExportGuard::acquire()?;
    // A window left by an export that failed to close it.
    if let Some(window) = app.get_webview_window(EXPORT_WINDOW) {
        let _ = window.destroy();
    }
    let (ready_tx, mut ready_rx) = tauri::async_runtime::channel::<()>(1);
    let ready = app.listen_any(READY_EVENT, move |_| {
        let _ = ready_tx.try_send(());
    });
    let (rendered_tx, mut rendered_rx) = tauri::async_runtime::channel::<String>(1);
    let rendered = app.listen_any(RENDERED_EVENT, move |event| {
        let _ = rendered_tx.try_send(event.payload().to_string());
    });

    let result = async {
        let window = tauri::WebviewWindowBuilder::new(
            app,
            EXPORT_WINDOW,
            WebviewUrl::App("pages/export.html".into()),
        )
        // WebKitGTK lays out a page it never showed at no size, and then
        // prints no pages, so on Linux the window shows off the screen.
        .visible(cfg!(target_os = "linux"))
        .position(-10000.0, -10000.0)
        .skip_taskbar(true)
        .focused(false)
        .decorations(false)
        .build()
        .map_err(|e| e.to_string())?;
        trace("window created");

        let printed = async {
            within(ready_rx.recv(), "load the export page").await?;
            trace("page ready");
            app.emit_to(
                EXPORT_WINDOW,
                DECK_EVENT,
                Deck {
                    markdown,
                    document_path,
                },
            )
            .map_err(|e| e.to_string())?;
            let payload = within(rendered_rx.recv(), "render the slides").await?;
            trace("slides rendered");
            let layout =
                match serde_json::from_str::<Rendered>(&payload).map_err(|e| e.to_string())? {
                    Rendered::Failed { error } => return Err(error),
                    Rendered::Done(layout) => layout,
                };
            print_to_pdf(&window, path, layout.width, layout.height).await?;
            trace("printed");
            write_metadata(path, &layout)
        }
        .await;
        let _ = window.destroy();
        printed
    }
    .await;

    app.unlisten(ready);
    app.unlisten(rendered);
    result
}

/// Waits for a message on a channel for at most `STEP_TIMEOUT`.
async fn within<T>(
    receive: impl std::future::Future<Output = Option<T>>,
    step: &str,
) -> Result<T, String> {
    match tokio::time::timeout(STEP_TIMEOUT, receive).await {
        Ok(Some(value)) => Ok(value),
        Ok(None) => Err(format!("Could not {step}.")),
        Err(_) => Err(format!("Timed out trying to {step}.")),
    }
}

/// Prints the page in `window` to a PDF at `path`, on pages `width` by
/// `height` CSS pixels, with no margins and with backgrounds.
async fn print_to_pdf(
    window: &WebviewWindow,
    path: &Path,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let (tx, mut rx) = tauri::async_runtime::channel::<Result<(), String>>(1);
    let path = path.to_path_buf();
    window
        .with_webview(move |webview| {
            let failed = tx.clone();
            let done: Done = Box::new(move |result| {
                let _ = tx.try_send(result);
            });
            if let Err(error) = native::print(webview, &path, width, height, done) {
                let _ = failed.try_send(Err(error));
            }
        })
        .map_err(|e| e.to_string())?;
    within(rx.recv(), "print the PDF").await?
}

/// Encodes a PDF text string: PDFDocEncoding covers ASCII, and anything else
/// needs UTF-16BE with a byte order mark.
fn text_string(text: &str) -> Object {
    if text.is_ascii() {
        return Object::string_literal(text);
    }
    let mut bytes = vec![0xfe, 0xff];
    for unit in text.encode_utf16() {
        bytes.extend_from_slice(&unit.to_be_bytes());
    }
    Object::String(bytes, StringFormat::Hexadecimal)
}

/// Decodes a PDF text string that `text_string` encoded.
fn decode_text_string(bytes: &[u8]) -> String {
    match bytes.strip_prefix(&[0xfe, 0xff]) {
        Some(utf16) => String::from_utf16_lossy(
            &utf16
                .chunks_exact(2)
                .map(|pair| u16::from_be_bytes([pair[0], pair[1]]))
                .collect::<Vec<_>>(),
        ),
        None => String::from_utf8_lossy(bytes).into_owned(),
    }
}

/// The document information dictionary's entries, as Marp CLI writes them.
fn metadata_entries(layout: &Layout) -> Vec<(&'static str, String)> {
    [
        ("Title", layout.title.clone()),
        ("Author", layout.author.clone()),
        ("Subject", layout.description.clone()),
        ("Keywords", layout.keywords.as_ref().map(|k| k.join("; "))),
    ]
    .into_iter()
    .filter_map(|(key, value)| value.filter(|v| !v.is_empty()).map(|v| (key, v)))
    .collect()
}

/// Writes the deck's title, author, description and keywords into the PDF's
/// document information, after the web view printed it.
fn write_metadata(path: &Path, layout: &Layout) -> Result<(), String> {
    let entries = metadata_entries(layout);
    if entries.is_empty() {
        return Ok(());
    }
    let mut document = Document::load(path).map_err(|e| e.to_string())?;
    let info_id = match document.trailer.get(b"Info").and_then(Object::as_reference) {
        Ok(id) => id,
        Err(_) => {
            let id = document.add_object(Dictionary::new());
            document.trailer.set("Info", Object::Reference(id));
            id
        }
    };
    let info = document
        .get_object_mut(info_id)
        .and_then(Object::as_dict_mut)
        .map_err(|e| e.to_string())?;
    for (key, value) in entries {
        info.set(key, text_string(&value));
    }
    document.save(path).map_err(|e| e.to_string())?;
    Ok(())
}

/// Describes a PDF for the smoke test: its number of pages, the first page's
/// size in points, and its title.
pub fn describe(path: &Path) -> Result<String, String> {
    let document = Document::load(path).map_err(|e| e.to_string())?;
    let pages = document.get_pages();
    let first = pages
        .values()
        .next()
        .and_then(|&id| document.get_dictionary(id).ok())
        .ok_or("The PDF has no pages.")?;
    let media_box = first
        .get(b"MediaBox")
        .and_then(Object::as_array)
        .map(|values| {
            values
                .iter()
                .filter_map(|value| value.as_float().ok())
                .map(|value| value.round().to_string())
                .collect::<Vec<_>>()
                .join(" ")
        })
        .unwrap_or_default();
    let title = document
        .trailer
        .get(b"Info")
        .and_then(Object::as_reference)
        .and_then(|id| document.get_dictionary(id))
        .and_then(|info| info.get(b"Title"))
        .and_then(Object::as_str)
        .map(decode_text_string)
        .unwrap_or_default();
    Ok(format!(
        "{} pages, media box [{media_box}], title {title:?}",
        pages.len()
    ))
}

#[cfg(windows)]
mod native {
    use std::path::Path;

    use tauri::webview::PlatformWebview;
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        ICoreWebView2Environment6, ICoreWebView2_7,
    };
    use webview2_com::PrintToPdfCompletedHandler;
    use windows_core::{Interface, HSTRING};

    /// WebView2 takes the paper size in inches, at 96 CSS pixels each.
    pub fn inches(pixels: f64) -> f64 {
        pixels / 96.0
    }

    pub fn print(
        webview: PlatformWebview,
        path: &Path,
        width: f64,
        height: f64,
        done: super::Done,
    ) -> Result<(), String> {
        let error = |e: windows_core::Error| e.message();
        unsafe {
            let core: ICoreWebView2_7 = webview
                .controller()
                .CoreWebView2()
                .and_then(|core| core.cast())
                .map_err(error)?;
            let environment: ICoreWebView2Environment6 =
                webview.environment().cast().map_err(error)?;
            let settings = environment.CreatePrintSettings().map_err(error)?;
            settings.SetPageWidth(inches(width)).map_err(error)?;
            settings.SetPageHeight(inches(height)).map_err(error)?;
            settings.SetMarginTop(0.0).map_err(error)?;
            settings.SetMarginBottom(0.0).map_err(error)?;
            settings.SetMarginLeft(0.0).map_err(error)?;
            settings.SetMarginRight(0.0).map_err(error)?;
            settings.SetScaleFactor(1.0).map_err(error)?;
            settings.SetShouldPrintBackgrounds(true).map_err(error)?;
            settings
                .SetShouldPrintHeaderAndFooter(false)
                .map_err(error)?;
            let handler = PrintToPdfCompletedHandler::create(Box::new(move |result, printed| {
                done(match result {
                    Ok(()) if printed => Ok(()),
                    Ok(()) => Err("WebView2 could not print the PDF.".to_string()),
                    Err(e) => Err(e.message()),
                });
                Ok(())
            }));
            core.PrintToPdf(&HSTRING::from(path), &settings, &handler)
                .map_err(error)
        }
    }
}

#[cfg(target_os = "macos")]
mod native {
    use std::cell::{Cell, RefCell};
    use std::ffi::c_void;
    use std::path::Path;

    use objc2::rc::Retained;
    use objc2::runtime::{AnyObject, Bool, NSObject};
    use objc2::{define_class, msg_send, sel, DefinedClass, MainThreadMarker, MainThreadOnly};
    use objc2_app_kit::{
        NSPrintInfo, NSPrintJobSavingURL, NSPrintOperation, NSPrintSaveJob,
        NSPrintingPaginationMode, NSWindow,
    };
    use objc2_foundation::{NSSize, NSString, NSURL};
    use objc2_web_kit::WKWebView;
    use tauri::webview::PlatformWebview;

    /// AppKit takes the paper size in points, at 0.75 per CSS pixel.
    pub fn points(pixels: f64) -> f64 {
        pixels * 0.75
    }

    pub struct Ivars {
        done: Cell<Option<super::Done>>,
    }

    define_class!(
        // Hears when the print operation has written the PDF.
        #[unsafe(super(NSObject))]
        #[thread_kind = MainThreadOnly]
        #[name = "MarkBricksPdfPrintDelegate"]
        #[ivars = Ivars]
        struct PrintDelegate;

        impl PrintDelegate {
            #[unsafe(method(printOperationDidRun:success:contextInfo:))]
            fn print_operation_did_run(
                &self,
                _operation: &NSPrintOperation,
                success: Bool,
                _context: *mut c_void,
            ) {
                if let Some(done) = self.ivars().done.take() {
                    done(if success.as_bool() {
                        Ok(())
                    } else {
                        Err("WebKit could not print the PDF.".to_string())
                    });
                }
            }
        }
    );

    thread_local! {
        // AppKit does not retain the delegate, so the last one lives here.
        static DELEGATE: RefCell<Option<Retained<PrintDelegate>>> = const { RefCell::new(None) };
    }

    pub fn print(
        webview: PlatformWebview,
        path: &Path,
        width: f64,
        height: f64,
        done: super::Done,
    ) -> Result<(), String> {
        let mtm = MainThreadMarker::new().ok_or("Not on the main thread.")?;
        // SAFETY: Tauri hands over its live WKWebView and NSWindow.
        let web_view: &WKWebView = unsafe { &*webview.inner().cast() };
        let window: &NSWindow = unsafe { &*webview.ns_window().cast() };

        let info = NSPrintInfo::new();
        info.setPaperSize(NSSize::new(points(width), points(height)));
        info.setTopMargin(0.0);
        info.setBottomMargin(0.0);
        info.setLeftMargin(0.0);
        info.setRightMargin(0.0);
        info.setHorizontallyCentered(false);
        info.setVerticallyCentered(false);
        info.setHorizontalPagination(NSPrintingPaginationMode::Fit);
        info.setVerticalPagination(NSPrintingPaginationMode::Automatic);
        let url = NSURL::fileURLWithPath(&NSString::from_str(&path.to_string_lossy()));
        let url: &AnyObject = &url;
        unsafe {
            info.setJobDisposition(NSPrintSaveJob);
            info.dictionary().insert(NSPrintJobSavingURL, url);
        }

        // SAFETY: The print info lives for the call.
        let operation = unsafe { web_view.printOperationWithPrintInfo(&info) };
        operation.setShowsPrintPanel(false);
        operation.setShowsProgressPanel(false);

        let delegate = PrintDelegate::alloc(mtm).set_ivars(Ivars {
            done: Cell::new(Some(done)),
        });
        // SAFETY: `init` of NSObject.
        let delegate: Retained<PrintDelegate> = unsafe { msg_send![super(delegate), init] };
        let target: &AnyObject = &delegate;
        // `runOperation` prints blank pages from a WKWebView, while a modal
        // run for its window prints them.
        unsafe {
            operation.runOperationModalForWindow_delegate_didRunSelector_contextInfo(
                window,
                Some(target),
                Some(sel!(printOperationDidRun:success:contextInfo:)),
                std::ptr::null_mut(),
            );
        }
        DELEGATE.with(|cell| cell.replace(Some(delegate)));
        Ok(())
    }
}

#[cfg(target_os = "linux")]
mod native {
    use std::cell::Cell;
    use std::path::Path;

    use gtk::{PageOrientation, PageSetup, PaperSize, PrintSettings, Unit};
    use tauri::webview::PlatformWebview;
    use webkit2gtk::{PrintOperation, PrintOperationExt};

    /// GTK takes the paper size in points, at 0.75 per CSS pixel.
    pub fn points(pixels: f64) -> f64 {
        pixels * 0.75
    }

    pub fn print(
        webview: PlatformWebview,
        path: &Path,
        width: f64,
        height: f64,
        done: super::Done,
    ) -> Result<(), String> {
        let uri = gtk::glib::filename_to_uri(path, None).map_err(|e| e.to_string())?;
        let paper = PaperSize::new_custom(
            "mark-bricks-slide",
            "Slide",
            points(width),
            points(height),
            Unit::Points,
        );
        let page_setup = PageSetup::new();
        page_setup.set_paper_size(&paper);
        page_setup.set_orientation(PageOrientation::Portrait);
        page_setup.set_top_margin(0.0, Unit::Points);
        page_setup.set_bottom_margin(0.0, Unit::Points);
        page_setup.set_left_margin(0.0, Unit::Points);
        page_setup.set_right_margin(0.0, Unit::Points);

        let settings = PrintSettings::new();
        // GTK names its file printer in the user's language, so the name
        // comes from GTK's own translations.
        settings.set_printer(&gtk::glib::dgettext(Some("gtk30"), "Print to File"));
        settings.set(&gtk::PRINT_SETTINGS_OUTPUT_FILE_FORMAT, Some("pdf"));
        settings.set(&gtk::PRINT_SETTINGS_OUTPUT_URI, Some(&uri));
        settings.set_paper_size(&paper);
        settings.set_orientation(PageOrientation::Portrait);

        let operation = PrintOperation::new(&webview.inner());
        operation.set_page_setup(&page_setup);
        operation.set_print_settings(&settings);
        // `finished` follows `failed` too, so the first result wins.
        let done = std::rc::Rc::new(Cell::new(Some(done)));
        let failed = done.clone();
        operation.connect_failed(move |_, error| {
            if let Some(done) = failed.take() {
                done(Err(error.to_string()));
            }
        });
        operation.connect_finished(move |_| {
            if let Some(done) = done.take() {
                done(Ok(()));
            }
        });
        operation.print();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use lopdf::dictionary;

    use super::*;

    #[test]
    fn runs_one_export_at_a_time() {
        let first = ExportGuard::acquire().unwrap();
        assert!(ExportGuard::acquire().is_err());
        drop(first);
        assert!(ExportGuard::acquire().is_ok());
    }

    #[test]
    fn encodes_ascii_as_a_literal_and_the_rest_as_utf16() {
        assert_eq!(text_string("Deck"), Object::string_literal("Deck"));
        assert_eq!(
            text_string("資料"),
            Object::String(
                vec![0xfe, 0xff, 0x8c, 0xc7, 0x65, 0x99],
                StringFormat::Hexadecimal
            )
        );
    }

    #[test]
    fn writes_only_the_metadata_a_deck_sets() {
        let layout = Layout {
            title: Some("Deck".into()),
            description: Some(String::new()),
            keywords: Some(vec!["a".into(), "b".into()]),
            ..Layout::default()
        };
        assert_eq!(
            metadata_entries(&layout),
            vec![
                ("Title", "Deck".to_string()),
                ("Keywords", "a; b".to_string())
            ]
        );
    }

    #[test]
    fn reads_the_layout_or_the_error_the_page_reports() {
        assert!(matches!(
            serde_json::from_str::<Rendered>(r#"{"error":"boom"}"#).unwrap(),
            Rendered::Failed { error } if error == "boom"
        ));
        assert!(matches!(
            serde_json::from_str::<Rendered>(r#"{"width":1280,"height":720,"title":"Deck"}"#).unwrap(),
            Rendered::Done(Layout { width, height, .. }) if width == 1280.0 && height == 720.0
        ));
    }

    #[cfg(windows)]
    #[test]
    fn converts_css_pixels_to_inches() {
        assert_eq!(native::inches(1280.0), 1280.0 / 96.0);
        assert_eq!(native::inches(960.0), 10.0);
    }

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    #[test]
    fn converts_css_pixels_to_points() {
        assert_eq!(native::points(1280.0), 960.0);
        assert_eq!(native::points(720.0), 540.0);
    }

    #[test]
    fn writes_metadata_into_a_pdf() {
        let dir = std::env::temp_dir().join(format!("mark-bricks-pdf-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path: PathBuf = dir.join("deck.pdf");
        let mut document = Document::with_version("1.5");
        let pages = document.new_object_id();
        let page = document.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages,
            "MediaBox" => vec![0.into(), 0.into(), 960.into(), 540.into()],
        });
        document.objects.insert(
            pages,
            Object::Dictionary(dictionary! {
                "Type" => "Pages",
                "Kids" => vec![page.into()],
                "Count" => 1,
            }),
        );
        let catalog = document.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages,
        });
        document.trailer.set("Root", catalog);
        document.save(&path).unwrap();

        write_metadata(
            &path,
            &Layout {
                title: Some("資料".into()),
                author: Some("Jane".into()),
                ..Layout::default()
            },
        )
        .unwrap();

        let document = Document::load(&path).unwrap();
        let info = document
            .trailer
            .get(b"Info")
            .and_then(Object::as_reference)
            .and_then(|id| document.get_dictionary(id))
            .unwrap();
        assert_eq!(info.get(b"Title").unwrap(), &text_string("資料"));
        assert_eq!(
            decode_text_string(info.get(b"Title").and_then(Object::as_str).unwrap()),
            "資料"
        );
        assert_eq!(info.get(b"Author").unwrap(), &text_string("Jane"));
        std::fs::remove_dir_all(dir).unwrap();
    }
}
