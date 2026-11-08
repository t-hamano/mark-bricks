//! The Anthropic API key for the AI assistant, kept in the OS credential
//! store: Keychain on macOS, Credential Manager on Windows, and the Secret
//! Service on Linux.
//!
//! The webview can save, delete, and check for the key, but never read it.
//! Only the Rust side reads it, to send requests to the API.

use tauri::WebviewWindow;

/// The service and account the key is stored under.
const SERVICE: &str = "com.markbricks.app";
const ACCOUNT: &str = "anthropic-api-key";

/// The only window that may change the key. The preview and export windows
/// render documents and have no use for it.
const MAIN_WINDOW: &str = "main";

/// Where the key is kept. The OS credential store in the app, and memory in
/// the tests.
pub trait KeyStore {
    fn get(&self) -> Result<Option<String>, String>;
    fn set(&self, key: &str) -> Result<(), String>;
    fn delete(&self) -> Result<(), String>;
}

/// The OS credential store.
pub struct OsKeyStore;

impl OsKeyStore {
    fn entry() -> Result<keyring::Entry, String> {
        keyring::Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string())
    }
}

impl KeyStore for OsKeyStore {
    fn get(&self) -> Result<Option<String>, String> {
        match Self::entry()?.get_password() {
            Ok(key) => Ok(Some(key)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(error) => Err(error.to_string()),
        }
    }

    fn set(&self, key: &str) -> Result<(), String> {
        Self::entry()?.set_password(key).map_err(|e| e.to_string())
    }

    fn delete(&self) -> Result<(), String> {
        match Self::entry()?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(error.to_string()),
        }
    }
}

/// Saves the key, replacing the one saved before. Surrounding whitespace,
/// as from a pasted key, is removed.
pub fn save_key(store: &impl KeyStore, key: &str) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("The API key is empty.".to_string());
    }
    store.set(key)
}

/// Whether a key is saved.
pub fn has_key(store: &impl KeyStore) -> Result<bool, String> {
    Ok(store.get()?.is_some_and(|key| !key.is_empty()))
}

/// Reads the saved key, for the requests to the API. Not exposed to the
/// webview.
#[allow(dead_code)] // Used by the API request command, which comes next.
pub fn read_key(store: &impl KeyStore) -> Result<Option<String>, String> {
    Ok(store.get()?.filter(|key| !key.is_empty()))
}

fn check_window(window: &WebviewWindow) -> Result<(), String> {
    if window.label() == MAIN_WINDOW {
        Ok(())
    } else {
        Err("This window cannot change the API key.".to_string())
    }
}

/// Runs a credential store call off the main thread, since the OS may wait
/// for the user, for example to unlock the keychain.
async fn run_blocking<T: Send + 'static>(
    operation: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(operation)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn save_ai_api_key(window: WebviewWindow, key: String) -> Result<(), String> {
    check_window(&window)?;
    run_blocking(move || save_key(&OsKeyStore, &key)).await
}

#[tauri::command]
pub async fn delete_ai_api_key(window: WebviewWindow) -> Result<(), String> {
    check_window(&window)?;
    run_blocking(|| OsKeyStore.delete()).await
}

#[tauri::command]
pub async fn has_ai_api_key() -> Result<bool, String> {
    run_blocking(|| has_key(&OsKeyStore)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;

    #[derive(Default)]
    struct MemoryKeyStore(RefCell<Option<String>>);

    impl KeyStore for MemoryKeyStore {
        fn get(&self) -> Result<Option<String>, String> {
            Ok(self.0.borrow().clone())
        }

        fn set(&self, key: &str) -> Result<(), String> {
            *self.0.borrow_mut() = Some(key.to_string());
            Ok(())
        }

        fn delete(&self) -> Result<(), String> {
            *self.0.borrow_mut() = None;
            Ok(())
        }
    }

    #[test]
    fn saves_reads_and_deletes_the_key() {
        let store = MemoryKeyStore::default();
        assert_eq!(has_key(&store), Ok(false));
        assert_eq!(read_key(&store), Ok(None));

        save_key(&store, "sk-ant-first").unwrap();
        save_key(&store, "sk-ant-second").unwrap();
        assert_eq!(has_key(&store), Ok(true));
        assert_eq!(read_key(&store), Ok(Some("sk-ant-second".to_string())));

        store.delete().unwrap();
        assert_eq!(has_key(&store), Ok(false));
    }

    #[test]
    fn trims_a_pasted_key() {
        let store = MemoryKeyStore::default();
        save_key(&store, "  sk-ant-key\n").unwrap();
        assert_eq!(read_key(&store), Ok(Some("sk-ant-key".to_string())));
    }

    #[test]
    fn rejects_an_empty_key() {
        let store = MemoryKeyStore::default();
        assert!(save_key(&store, " \n").is_err());
        assert_eq!(has_key(&store), Ok(false));
    }

    #[test]
    fn treats_an_empty_saved_key_as_none() {
        let store = MemoryKeyStore(RefCell::new(Some(String::new())));
        assert_eq!(has_key(&store), Ok(false));
        assert_eq!(read_key(&store), Ok(None));
    }
}
