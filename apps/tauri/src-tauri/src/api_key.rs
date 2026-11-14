//! The AI assistant's API keys, one per provider, kept in the OS credential
//! store: Keychain on macOS, Credential Manager on Windows, and the Secret
//! Service on Linux.
//!
//! The webview can save, delete, and check for a key, but never read it.
//! Only the Rust side reads it, to send requests to the API.

use serde::Deserialize;
use tauri::WebviewWindow;

/// The service the keys are stored under.
const SERVICE: &str = "com.markbricks.app";

/// An AI provider whose API key the app keeps. The webview names it in
/// lower case, such as `"anthropic"`.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    Anthropic,
    OpenAi,
    Google,
}

impl Provider {
    /// The account the provider's key is stored under.
    fn account(self) -> &'static str {
        match self {
            Provider::Anthropic => "anthropic-api-key",
            Provider::OpenAi => "openai-api-key",
            Provider::Google => "google-api-key",
        }
    }
}

/// The only window that may change or use the key. The preview and export windows
/// render documents and have no use for it.
const MAIN_WINDOW: &str = "main";

/// Where the key is kept. The OS credential store in the app, and memory in
/// the tests.
pub trait KeyStore {
    fn get(&self, provider: Provider) -> Result<Option<String>, String>;
    fn set(&self, provider: Provider, key: &str) -> Result<(), String>;
    fn delete(&self, provider: Provider) -> Result<(), String>;
}

/// The OS credential store.
pub struct OsKeyStore;

impl OsKeyStore {
    fn entry(provider: Provider) -> Result<keyring::Entry, String> {
        keyring::Entry::new(SERVICE, provider.account()).map_err(|e| e.to_string())
    }
}

impl KeyStore for OsKeyStore {
    fn get(&self, provider: Provider) -> Result<Option<String>, String> {
        match Self::entry(provider)?.get_password() {
            Ok(key) => Ok(Some(key)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(error) => Err(error.to_string()),
        }
    }

    fn set(&self, provider: Provider, key: &str) -> Result<(), String> {
        Self::entry(provider)?
            .set_password(key)
            .map_err(|e| e.to_string())
    }

    fn delete(&self, provider: Provider) -> Result<(), String> {
        match Self::entry(provider)?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(error.to_string()),
        }
    }
}

/// Saves the key, replacing the one saved before. Surrounding whitespace,
/// as from a pasted key, is removed.
pub fn save_key(store: &impl KeyStore, provider: Provider, key: &str) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("The API key is empty.".to_string());
    }
    store.set(provider, key)
}

/// Whether a key is saved for the provider.
pub fn has_key(store: &impl KeyStore, provider: Provider) -> Result<bool, String> {
    Ok(store.get(provider)?.is_some_and(|key| !key.is_empty()))
}

/// Reads the saved key, for the requests to the API. Not exposed to the
/// webview.
pub fn read_key(store: &impl KeyStore, provider: Provider) -> Result<Option<String>, String> {
    Ok(store.get(provider)?.filter(|key| !key.is_empty()))
}

pub(crate) fn check_window(window: &WebviewWindow) -> Result<(), String> {
    if window.label() == MAIN_WINDOW {
        Ok(())
    } else {
        Err("This window cannot use the API key.".to_string())
    }
}

/// Runs a credential store call off the main thread, since the OS may wait
/// for the user, for example to unlock the keychain.
pub(crate) async fn run_blocking<T: Send + 'static>(
    operation: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(operation)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn save_ai_api_key(
    window: WebviewWindow,
    provider: Provider,
    key: String,
) -> Result<(), String> {
    check_window(&window)?;
    run_blocking(move || save_key(&OsKeyStore, provider, &key)).await
}

#[tauri::command]
pub async fn delete_ai_api_key(window: WebviewWindow, provider: Provider) -> Result<(), String> {
    check_window(&window)?;
    run_blocking(move || OsKeyStore.delete(provider)).await
}

#[tauri::command]
pub async fn has_ai_api_key(provider: Provider) -> Result<bool, String> {
    run_blocking(move || has_key(&OsKeyStore, provider)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;
    use std::collections::HashMap;

    #[derive(Default)]
    struct MemoryKeyStore(RefCell<HashMap<Provider, String>>);

    impl KeyStore for MemoryKeyStore {
        fn get(&self, provider: Provider) -> Result<Option<String>, String> {
            Ok(self.0.borrow().get(&provider).cloned())
        }

        fn set(&self, provider: Provider, key: &str) -> Result<(), String> {
            self.0.borrow_mut().insert(provider, key.to_string());
            Ok(())
        }

        fn delete(&self, provider: Provider) -> Result<(), String> {
            self.0.borrow_mut().remove(&provider);
            Ok(())
        }
    }

    const ANTHROPIC: Provider = Provider::Anthropic;

    #[test]
    fn saves_reads_and_deletes_the_key() {
        let store = MemoryKeyStore::default();
        assert_eq!(has_key(&store, ANTHROPIC), Ok(false));
        assert_eq!(read_key(&store, ANTHROPIC), Ok(None));

        save_key(&store, ANTHROPIC, "sk-ant-first").unwrap();
        save_key(&store, ANTHROPIC, "sk-ant-second").unwrap();
        assert_eq!(has_key(&store, ANTHROPIC), Ok(true));
        assert_eq!(
            read_key(&store, ANTHROPIC),
            Ok(Some("sk-ant-second".to_string()))
        );

        store.delete(ANTHROPIC).unwrap();
        assert_eq!(has_key(&store, ANTHROPIC), Ok(false));
    }

    #[test]
    fn trims_a_pasted_key() {
        let store = MemoryKeyStore::default();
        save_key(&store, ANTHROPIC, "  sk-ant-key\n").unwrap();
        assert_eq!(
            read_key(&store, ANTHROPIC),
            Ok(Some("sk-ant-key".to_string()))
        );
    }

    #[test]
    fn rejects_an_empty_key() {
        let store = MemoryKeyStore::default();
        assert!(save_key(&store, ANTHROPIC, " \n").is_err());
        assert_eq!(has_key(&store, ANTHROPIC), Ok(false));
    }

    #[test]
    fn treats_an_empty_saved_key_as_none() {
        let store = MemoryKeyStore::default();
        store.set(ANTHROPIC, "").unwrap();
        assert_eq!(has_key(&store, ANTHROPIC), Ok(false));
        assert_eq!(read_key(&store, ANTHROPIC), Ok(None));
    }

    #[test]
    fn reads_the_provider_the_webview_names() {
        assert_eq!(
            serde_json::from_str::<Provider>("\"anthropic\"").unwrap(),
            Provider::Anthropic
        );
        assert_eq!(
            serde_json::from_str::<Provider>("\"openai\"").unwrap(),
            Provider::OpenAi
        );
        assert_eq!(
            serde_json::from_str::<Provider>("\"google\"").unwrap(),
            Provider::Google
        );
        assert!(serde_json::from_str::<Provider>("\"unknown\"").is_err());
    }

    #[test]
    fn keeps_the_account_of_the_anthropic_key() {
        // Changing it would lose the keys users already saved.
        assert_eq!(Provider::Anthropic.account(), "anthropic-api-key");
    }

    #[test]
    fn keeps_each_provider_s_key_apart() {
        let store = MemoryKeyStore::default();
        save_key(&store, ANTHROPIC, "sk-ant-key").unwrap();
        assert_eq!(has_key(&store, Provider::OpenAi), Ok(false));
        save_key(&store, Provider::OpenAi, "sk-openai-key").unwrap();
        assert_eq!(
            read_key(&store, ANTHROPIC),
            Ok(Some("sk-ant-key".to_string()))
        );
        assert_eq!(
            read_key(&store, Provider::OpenAi),
            Ok(Some("sk-openai-key".to_string()))
        );
    }
}
