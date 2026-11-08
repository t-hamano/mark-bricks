//! Sends the AI assistant's requests to the provider's API with the API key,
//! and streams the response back to the webview. The key stays here: the
//! webview sends the request body and gets the response, but never the key.
//!
//! Each provider has one fixed endpoint, so the command cannot be used to
//! send the key anywhere else.

use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

use futures_util::StreamExt;
use serde::Serialize;
use tauri::ipc::Channel;
use tauri::{State, WebviewWindow};
use tokio::sync::oneshot;

use crate::api_key::{self, OsKeyStore, Provider};

const ANTHROPIC_MESSAGES_URL: &str = "https://api.anthropic.com/v1/messages";

/// The API version the adapter's requests are written for.
const ANTHROPIC_VERSION: &str = "2026-10-21";

/// The beta features the adapter's requests use: `fallbacks: "default"`.
const ANTHROPIC_BETAS: &str = "server-side-fallback-2026-07-01";

/// The requests in progress, by the id the webview gave them, so that they
/// can be cancelled.
#[derive(Default)]
pub struct AiRequests(Mutex<HashMap<String, oneshot::Sender<()>>>);

/// What the webview receives while the response streams in.
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
pub enum AiStreamEvent {
    /// The next piece of the response body.
    Chunk(String),
    /// The response body ended. Sent last, so the webview knows it has
    /// every chunk.
    End,
}

#[derive(Debug, PartialEq, Serialize)]
#[serde(tag = "code", rename_all = "snake_case")]
pub enum AiRequestError {
    /// No API key is saved for the provider.
    NoApiKey,
    /// The API answered with an error status. `body` is its response body.
    Http {
        status: u16,
        body: String,
    },
    /// The API could not be reached, or the connection broke.
    Network {
        message: String,
    },
    Cancelled,
    Other {
        message: String,
    },
}

impl AiRequestError {
    fn other(error: impl ToString) -> Self {
        Self::Other {
            message: error.to_string(),
        }
    }

    fn network(error: reqwest::Error) -> Self {
        Self::Network {
            message: error.to_string(),
        }
    }
}

/// The URL and headers of a request to the provider's API.
fn request_parts(provider: Provider, api_key: &str) -> (&'static str, Vec<(&'static str, String)>) {
    match provider {
        Provider::Anthropic => (
            ANTHROPIC_MESSAGES_URL,
            vec![
                ("x-api-key", api_key.to_string()),
                ("anthropic-version", ANTHROPIC_VERSION.to_string()),
                ("anthropic-beta", ANTHROPIC_BETAS.to_string()),
                ("content-type", "application/json".to_string()),
            ],
        ),
    }
}

fn client() -> Result<&'static reqwest::Client, AiRequestError> {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    if let Some(client) = CLIENT.get() {
        return Ok(client);
    }
    // reqwest is built without a TLS crypto provider, as for the updater.
    if rustls::crypto::CryptoProvider::get_default().is_none() {
        let _ = rustls::crypto::ring::default_provider().install_default();
    }
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(30))
        // The API sends pings while the model thinks, so a long silence
        // means the connection is gone.
        .read_timeout(Duration::from_secs(300))
        .build()
        .map_err(AiRequestError::other)?;
    Ok(CLIENT.get_or_init(|| client))
}

/// Decodes a byte stream as UTF-8 when a character can be cut between
/// chunks.
#[derive(Default)]
struct Utf8Decoder {
    pending: Vec<u8>,
}

impl Utf8Decoder {
    /// Returns the text the bytes complete. An incomplete character at the
    /// end waits for the next chunk, and invalid bytes become U+FFFD.
    fn push(&mut self, bytes: &[u8]) -> String {
        self.pending.extend_from_slice(bytes);
        let mut text = String::new();
        loop {
            match std::str::from_utf8(&self.pending) {
                Ok(valid) => {
                    text.push_str(valid);
                    self.pending.clear();
                    return text;
                }
                Err(error) => {
                    let valid_up_to = error.valid_up_to();
                    text.push_str(
                        std::str::from_utf8(&self.pending[..valid_up_to])
                            .expect("the prefix is valid UTF-8"),
                    );
                    match error.error_len() {
                        // The rest may be completed by the next chunk.
                        None => {
                            self.pending.drain(..valid_up_to);
                            return text;
                        }
                        Some(len) => {
                            text.push(char::REPLACEMENT_CHARACTER);
                            self.pending.drain(..valid_up_to + len);
                        }
                    }
                }
            }
        }
    }

    /// Returns what is left when the stream ends.
    fn finish(&mut self) -> String {
        let text = String::from_utf8_lossy(&self.pending).into_owned();
        self.pending.clear();
        text
    }
}

async fn send(
    provider: Provider,
    api_key: String,
    body: String,
    on_event: &Channel<AiStreamEvent>,
) -> Result<(), AiRequestError> {
    let (url, headers) = request_parts(provider, &api_key);
    let mut request = client()?.post(url).body(body);
    for (name, value) in headers {
        request = request.header(name, value);
    }
    let response = request.send().await.map_err(AiRequestError::network)?;

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(AiRequestError::Http {
            status: status.as_u16(),
            body,
        });
    }

    let mut decoder = Utf8Decoder::default();
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let text = decoder.push(&chunk.map_err(AiRequestError::network)?);
        if !text.is_empty() {
            on_event
                .send(AiStreamEvent::Chunk(text))
                .map_err(AiRequestError::other)?;
        }
    }
    let rest = decoder.finish();
    if !rest.is_empty() {
        on_event
            .send(AiStreamEvent::Chunk(rest))
            .map_err(AiRequestError::other)?;
    }
    on_event
        .send(AiStreamEvent::End)
        .map_err(AiRequestError::other)
}

/// Sends `body` to the provider's API and streams the response body through
/// `on_event`. `id` names the request for `cancel_ai_request`.
#[tauri::command]
pub async fn ai_request(
    window: WebviewWindow,
    requests: State<'_, AiRequests>,
    id: String,
    provider: Provider,
    body: String,
    on_event: Channel<AiStreamEvent>,
) -> Result<(), AiRequestError> {
    api_key::check_window(&window).map_err(AiRequestError::other)?;

    // Registered before the key is read, since reading it can wait for the
    // user to unlock the keychain, and the request may be stopped meanwhile.
    let (cancel, cancelled) = oneshot::channel();
    requests
        .0
        .lock()
        .map_err(AiRequestError::other)?
        .insert(id.clone(), cancel);

    let request = async {
        let api_key = api_key::run_blocking(move || api_key::read_key(&OsKeyStore, provider))
            .await
            .map_err(AiRequestError::other)?
            .ok_or(AiRequestError::NoApiKey)?;
        send(provider, api_key, body, &on_event).await
    };
    let result = tokio::select! {
        result = request => result,
        _ = cancelled => Err(AiRequestError::Cancelled),
    };

    if let Ok(mut requests) = requests.0.lock() {
        requests.remove(&id);
    }
    result
}

/// Stops the request named `id`. Does nothing when it already ended.
#[tauri::command]
pub fn cancel_ai_request(requests: State<'_, AiRequests>, id: String) {
    let cancel = requests
        .0
        .lock()
        .ok()
        .and_then(|mut requests| requests.remove(&id));
    if let Some(cancel) = cancel {
        let _ = cancel.send(());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sends_anthropic_requests_to_its_api_with_the_key() {
        let (url, headers) = request_parts(Provider::Anthropic, "sk-ant-key");
        assert_eq!(url, "https://api.anthropic.com/v1/messages");
        assert!(headers.contains(&("x-api-key", "sk-ant-key".to_string())));
        assert!(headers.contains(&("anthropic-version", "2026-10-21".to_string())));
        assert!(headers.contains(&(
            "anthropic-beta",
            "server-side-fallback-2026-07-01".to_string()
        )));
    }

    #[test]
    fn decodes_characters_cut_between_chunks() {
        let bytes = "見出し".as_bytes();
        let mut decoder = Utf8Decoder::default();
        let mut text = String::new();
        for byte in bytes {
            text.push_str(&decoder.push(&[*byte]));
        }
        text.push_str(&decoder.finish());
        assert_eq!(text, "見出し");
    }

    #[test]
    fn replaces_invalid_bytes() {
        let mut decoder = Utf8Decoder::default();
        assert_eq!(decoder.push(b"a\xffb"), "a\u{FFFD}b");
        // An incomplete character at the very end is replaced too.
        assert_eq!(decoder.push(b"c\xe8"), "c");
        assert_eq!(decoder.finish(), "\u{FFFD}");
    }

    #[test]
    fn serializes_events_and_errors_for_the_webview() {
        assert_eq!(
            serde_json::to_value(AiStreamEvent::Chunk("data".to_string())).unwrap(),
            serde_json::json!({ "event": "chunk", "data": "data" })
        );
        assert_eq!(
            serde_json::to_value(AiStreamEvent::End).unwrap(),
            serde_json::json!({ "event": "end" })
        );
        assert_eq!(
            serde_json::to_value(AiRequestError::Http {
                status: 401,
                body: "{}".to_string()
            })
            .unwrap(),
            serde_json::json!({ "code": "http", "status": 401, "body": "{}" })
        );
        assert_eq!(
            serde_json::to_value(AiRequestError::NoApiKey).unwrap(),
            serde_json::json!({ "code": "no_api_key" })
        );
    }
}
