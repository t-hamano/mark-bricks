//! Sends the AI assistant's requests to the provider's API with the API key,
//! and streams the response back to the webview. The key stays here: the
//! webview sends the request body and gets the response, but never the key.
//!
//! Each provider has fixed endpoints, so the command cannot be used to send
//! the key anywhere else. The Gemini API names the model in the URL, so only
//! a model id is accepted there.

use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tauri::{State, WebviewWindow};
use tokio::sync::oneshot;

use crate::api_key::{self, OsKeyStore, Provider};

const ANTHROPIC_MESSAGES_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODELS_URL: &str = "https://api.anthropic.com/v1/models";
const OPENAI_RESPONSES_URL: &str = "https://api.openai.com/v1/responses";
const OPENAI_MODELS_URL: &str = "https://api.openai.com/v1/models";
const GEMINI_MODELS_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models";

/// The most models the Models API lists in one page.
const MODELS_PAGE_LIMIT: &str = "1000";

/// The most models the Gemini Models API lists in one page.
const GEMINI_MODELS_PAGE_SIZE: &str = "1000";

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

/// The API endpoints the commands send requests to.
#[derive(Clone, Copy, Debug, PartialEq)]
enum Endpoint<'a> {
    /// Sends a message and streams the answer. The Gemini API names the
    /// model in the URL, and the other APIs in the body, where `model` is
    /// not used.
    Messages { model: &'a str },
    /// Lists the models.
    Models,
}

/// The URL and headers of a request to the provider's API.
fn request_parts(
    provider: Provider,
    endpoint: Endpoint,
    api_key: &str,
) -> (String, Vec<(&'static str, String)>) {
    match provider {
        Provider::Anthropic => {
            let mut headers = vec![
                ("x-api-key", api_key.to_string()),
                ("anthropic-version", ANTHROPIC_VERSION.to_string()),
                ("anthropic-beta", ANTHROPIC_BETAS.to_string()),
            ];
            let url = match endpoint {
                Endpoint::Messages { .. } => {
                    headers.push(("content-type", "application/json".to_string()));
                    ANTHROPIC_MESSAGES_URL
                }
                Endpoint::Models => ANTHROPIC_MODELS_URL,
            };
            (url.to_string(), headers)
        }
        Provider::OpenAi => {
            let mut headers = vec![("authorization", format!("Bearer {api_key}"))];
            let url = match endpoint {
                Endpoint::Messages { .. } => {
                    headers.push(("content-type", "application/json".to_string()));
                    OPENAI_RESPONSES_URL
                }
                Endpoint::Models => OPENAI_MODELS_URL,
            };
            (url.to_string(), headers)
        }
        Provider::Google => {
            let mut headers = vec![("x-goog-api-key", api_key.to_string())];
            let url = match endpoint {
                Endpoint::Messages { model } => {
                    headers.push(("content-type", "application/json".to_string()));
                    format!("{GEMINI_MODELS_URL}/{model}:streamGenerateContent?alt=sse")
                }
                Endpoint::Models => GEMINI_MODELS_URL.to_string(),
            };
            (url, headers)
        }
    }
}

/// Whether `model` can be put in the path of a Gemini API URL: a model id,
/// such as `gemini-3.6-flash`, and nothing that changes the path.
fn is_model_id(model: &str) -> bool {
    !model.is_empty()
        && !model.starts_with('.')
        && model
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '.' | '_'))
}

/// Splits the model from a request's body, for the APIs that name it in the
/// URL. The webview sends it in the body's `model`, which the Gemini API
/// does not accept, so it is taken out.
///
/// Returns the model, or an empty string for the other APIs, and the body
/// to send.
fn split_model(provider: Provider, body: String) -> Result<(String, String), AiRequestError> {
    if provider != Provider::Google {
        return Ok((String::new(), body));
    }
    let mut value: serde_json::Value =
        serde_json::from_str(&body).map_err(AiRequestError::other)?;
    let model = value
        .as_object_mut()
        .and_then(|object| object.remove("model"))
        .and_then(|model| model.as_str().map(str::to_string))
        .filter(|model| is_model_id(model))
        .ok_or_else(|| AiRequestError::other("The request names no valid model."))?;
    Ok((model, value.to_string()))
}

/// Reads the saved key, off the main thread.
async fn read_api_key(provider: Provider) -> Result<String, AiRequestError> {
    api_key::run_blocking(move || api_key::read_key(&OsKeyStore, provider))
        .await
        .map_err(AiRequestError::other)?
        .ok_or(AiRequestError::NoApiKey)
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
        // The key is sent in headers, such as `x-api-key`, that reqwest
        // keeps when a redirect leads to another host. The APIs do not
        // redirect, so a redirect is answered as an error instead.
        .redirect(reqwest::redirect::Policy::none())
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
    let (model, body) = split_model(provider, body)?;
    let (url, headers) = request_parts(provider, Endpoint::Messages { model: &model }, &api_key);
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
        let api_key = read_api_key(provider).await?;
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

/// A model the API key can use.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all(serialize = "camelCase"))]
pub struct AiModel {
    pub id: String,
    pub display_name: String,
}

/// A page of the Models API's list.
#[derive(Debug, Deserialize)]
struct ModelsPage {
    data: Vec<AiModel>,
    #[serde(default)]
    has_more: bool,
    last_id: Option<String>,
}

/// A model of the OpenAI Models API's list, which has no display name.
#[derive(Debug, Deserialize)]
struct OpenAiModel {
    id: String,
    #[serde(default)]
    created: i64,
}

/// The OpenAI Models API's list, which comes in one page.
#[derive(Debug, Deserialize)]
struct OpenAiModelList {
    data: Vec<OpenAiModel>,
}

impl OpenAiModelList {
    /// The models, newest first, named by their ids.
    fn into_models(self) -> Vec<AiModel> {
        let mut models = self.data;
        models.sort_by(|a, b| b.created.cmp(&a.created).then_with(|| a.id.cmp(&b.id)));
        models
            .into_iter()
            .map(|model| AiModel {
                display_name: model.id.clone(),
                id: model.id,
            })
            .collect()
    }
}

/// A model of the Gemini Models API's list.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeminiModel {
    /// The model's resource name, such as `models/gemini-3.6-flash`.
    name: String,
    #[serde(default)]
    display_name: String,
    #[serde(default)]
    supported_generation_methods: Vec<String>,
}

/// A page of the Gemini Models API's list.
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeminiModelsPage {
    #[serde(default)]
    models: Vec<GeminiModel>,
    next_page_token: Option<String>,
}

impl GeminiModelsPage {
    /// The models that can answer a message, named by their ids.
    fn into_models(self) -> Vec<AiModel> {
        self.models
            .into_iter()
            .filter(|model| {
                model
                    .supported_generation_methods
                    .iter()
                    .any(|method| method == "generateContent")
            })
            .map(|model| {
                let id = model
                    .name
                    .strip_prefix("models/")
                    .unwrap_or(&model.name)
                    .to_string();
                AiModel {
                    display_name: if model.display_name.is_empty() {
                        id.clone()
                    } else {
                        model.display_name
                    },
                    id,
                }
            })
            .collect()
    }
}

/// The most pages read, so that a broken `has_more` cannot loop forever.
const MAX_MODELS_PAGES: usize = 10;

/// Sends a GET request to the provider's Models API, and returns the
/// response body.
async fn get_models(
    provider: Provider,
    api_key: &str,
    params: &[(&str, &str)],
) -> Result<String, AiRequestError> {
    let (url, headers) = request_parts(provider, Endpoint::Models, api_key);
    let models_url =
        reqwest::Url::parse_with_params(&url, params).map_err(AiRequestError::other)?;
    let mut request = client()?.get(models_url);
    for (name, value) in headers {
        request = request.header(name, value);
    }
    let response = request.send().await.map_err(AiRequestError::network)?;
    let status = response.status();
    let body = response.text().await.map_err(AiRequestError::network)?;
    if !status.is_success() {
        return Err(AiRequestError::Http {
            status: status.as_u16(),
            body,
        });
    }
    Ok(body)
}

/// Reads one page of the Anthropic Models API's list.
async fn fetch_models_page(
    api_key: &str,
    limit: &str,
    after_id: Option<&str>,
) -> Result<ModelsPage, AiRequestError> {
    let mut params = vec![("limit", limit)];
    if let Some(after_id) = after_id {
        params.push(("after_id", after_id));
    }
    let body = get_models(Provider::Anthropic, api_key, &params).await?;
    serde_json::from_str(&body).map_err(AiRequestError::other)
}

/// Reads one page of the Gemini Models API's list.
async fn fetch_gemini_models_page(
    api_key: &str,
    page_size: &str,
    page_token: Option<&str>,
) -> Result<GeminiModelsPage, AiRequestError> {
    let mut params = vec![("pageSize", page_size)];
    if let Some(page_token) = page_token {
        params.push(("pageToken", page_token));
    }
    let body = get_models(Provider::Google, api_key, &params).await?;
    serde_json::from_str(&body).map_err(AiRequestError::other)
}

/// Reads the Gemini Models API's list.
async fn fetch_gemini_models(api_key: &str) -> Result<Vec<AiModel>, AiRequestError> {
    let mut models = Vec::new();
    let mut page_token: Option<String> = None;
    for _ in 0..MAX_MODELS_PAGES {
        let mut page =
            fetch_gemini_models_page(api_key, GEMINI_MODELS_PAGE_SIZE, page_token.as_deref())
                .await?;
        let next = page
            .next_page_token
            .take()
            .filter(|token| !token.is_empty());
        models.extend(page.into_models());
        match next {
            Some(token) => page_token = Some(token),
            None => break,
        }
    }
    Ok(models)
}

/// Reads the OpenAI Models API's list.
async fn fetch_openai_models(api_key: &str) -> Result<Vec<AiModel>, AiRequestError> {
    let body = get_models(Provider::OpenAi, api_key, &[]).await?;
    let list: OpenAiModelList = serde_json::from_str(&body).map_err(AiRequestError::other)?;
    Ok(list.into_models())
}

async fn fetch_models(provider: Provider, api_key: String) -> Result<Vec<AiModel>, AiRequestError> {
    match provider {
        Provider::OpenAi => return fetch_openai_models(&api_key).await,
        Provider::Google => return fetch_gemini_models(&api_key).await,
        Provider::Anthropic => {}
    }
    let mut models = Vec::new();
    let mut after_id: Option<String> = None;
    for _ in 0..MAX_MODELS_PAGES {
        let page = fetch_models_page(&api_key, MODELS_PAGE_LIMIT, after_id.as_deref()).await?;
        models.extend(page.data);
        match page.last_id {
            Some(last_id) if page.has_more => after_id = Some(last_id),
            _ => break,
        }
    }
    Ok(models)
}

/// Checks that the API accepts `key`, before it is saved, by listing one
/// model with it.
#[tauri::command]
pub async fn check_ai_api_key(
    window: WebviewWindow,
    provider: Provider,
    key: String,
) -> Result<(), AiRequestError> {
    api_key::check_window(&window).map_err(AiRequestError::other)?;
    let key = key.trim();
    match provider {
        Provider::Anthropic => {
            fetch_models_page(key, "1", None).await?;
        }
        // The list comes in one page, so there is no shorter request.
        Provider::OpenAi => {
            get_models(provider, key, &[]).await?;
        }
        Provider::Google => {
            fetch_gemini_models_page(key, "1", None).await?;
        }
    }
    Ok(())
}

/// Lists the models the saved API key can use, newest first.
#[tauri::command]
pub async fn list_ai_models(
    window: WebviewWindow,
    provider: Provider,
) -> Result<Vec<AiModel>, AiRequestError> {
    api_key::check_window(&window).map_err(AiRequestError::other)?;
    let api_key = read_api_key(provider).await?;
    fetch_models(provider, api_key).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sends_anthropic_requests_to_its_api_with_the_key() {
        let (url, headers) = request_parts(
            Provider::Anthropic,
            Endpoint::Messages { model: "" },
            "sk-ant-key",
        );
        assert_eq!(url, "https://api.anthropic.com/v1/messages");
        assert!(headers.contains(&("x-api-key", "sk-ant-key".to_string())));
        assert!(headers.contains(&("anthropic-version", "2026-10-21".to_string())));
        assert!(headers.contains(&(
            "anthropic-beta",
            "server-side-fallback-2026-07-01".to_string()
        )));
    }

    #[test]
    fn lists_anthropic_models_from_its_api_with_the_key() {
        let (url, headers) = request_parts(Provider::Anthropic, Endpoint::Models, "sk-ant-key");
        assert_eq!(url, "https://api.anthropic.com/v1/models");
        assert!(headers.contains(&("x-api-key", "sk-ant-key".to_string())));
        assert!(headers.contains(&("anthropic-version", "2026-10-21".to_string())));
    }

    #[test]
    fn sends_openai_requests_to_its_api_with_the_key() {
        let (url, headers) =
            request_parts(Provider::OpenAi, Endpoint::Messages { model: "" }, "sk-key");
        assert_eq!(url, "https://api.openai.com/v1/responses");
        assert!(headers.contains(&("authorization", "Bearer sk-key".to_string())));
        assert!(headers.contains(&("content-type", "application/json".to_string())));
    }

    #[test]
    fn lists_openai_models_from_its_api_with_the_key() {
        let (url, headers) = request_parts(Provider::OpenAi, Endpoint::Models, "sk-key");
        assert_eq!(url, "https://api.openai.com/v1/models");
        assert_eq!(
            headers,
            vec![("authorization", "Bearer sk-key".to_string())]
        );
    }

    #[test]
    fn sends_gemini_requests_to_the_model_s_url_with_the_key() {
        let (url, headers) = request_parts(
            Provider::Google,
            Endpoint::Messages {
                model: "gemini-3.6-flash",
            },
            "AIza-key",
        );
        assert_eq!(
            url,
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?alt=sse"
        );
        assert!(headers.contains(&("x-goog-api-key", "AIza-key".to_string())));
        assert!(headers.contains(&("content-type", "application/json".to_string())));
    }

    #[test]
    fn lists_gemini_models_from_its_api_with_the_key() {
        let (url, headers) = request_parts(Provider::Google, Endpoint::Models, "AIza-key");
        assert_eq!(
            url,
            "https://generativelanguage.googleapis.com/v1beta/models"
        );
        assert_eq!(headers, vec![("x-goog-api-key", "AIza-key".to_string())]);
    }

    #[test]
    fn takes_the_model_out_of_a_gemini_request() {
        let (model, body) = split_model(
            Provider::Google,
            r#"{"model":"gemini-3.6-flash","contents":[]}"#.to_string(),
        )
        .unwrap();
        assert_eq!(model, "gemini-3.6-flash");
        assert_eq!(body, r#"{"contents":[]}"#);
    }

    #[test]
    fn keeps_the_body_of_other_requests() {
        let body = r#"{"model":"gpt-6-astra"}"#.to_string();
        assert_eq!(
            split_model(Provider::OpenAi, body.clone()).unwrap(),
            (String::new(), body)
        );
    }

    #[test]
    fn rejects_a_model_that_would_change_the_url() {
        for body in [
            r#"{"contents":[]}"#,
            r#"{"model":""}"#,
            r#"{"model":"../files"}"#,
            r#"{"model":"gemini?alt=json"}"#,
            r#"{"model":"a/b"}"#,
            r#"{"model":".."}"#,
            r#"{"model":3}"#,
        ] {
            assert!(
                split_model(Provider::Google, body.to_string()).is_err(),
                "{body}"
            );
        }
    }

    #[test]
    fn lists_the_gemini_models_that_answer_messages() {
        let page: GeminiModelsPage = serde_json::from_str(
            r#"{"models":[{"name":"models/gemini-3.6-flash","displayName":"Gemini 3.6 Flash","supportedGenerationMethods":["generateContent","countTokens"]},{"name":"models/gemini-embedding-2","displayName":"Gemini Embedding 2","supportedGenerationMethods":["embedContent"]}],"nextPageToken":"next"}"#,
        )
        .unwrap();
        assert_eq!(page.next_page_token.as_deref(), Some("next"));
        assert_eq!(
            serde_json::to_value(page.into_models()).unwrap(),
            serde_json::json!([{ "id": "gemini-3.6-flash", "displayName": "Gemini 3.6 Flash" }])
        );
    }

    #[test]
    fn lists_openai_models_newest_first() {
        let list: OpenAiModelList = serde_json::from_str(
            r#"{"object":"list","data":[{"id":"gpt-old","object":"model","created":100,"owned_by":"openai"},{"id":"gpt-new","object":"model","created":200,"owned_by":"openai"}]}"#,
        )
        .unwrap();
        assert_eq!(
            serde_json::to_value(list.into_models()).unwrap(),
            serde_json::json!([
                { "id": "gpt-new", "displayName": "gpt-new" },
                { "id": "gpt-old", "displayName": "gpt-old" }
            ])
        );
    }

    #[test]
    fn reads_a_page_of_models_and_sends_them_to_the_webview() {
        let page: ModelsPage = serde_json::from_str(
            r#"{"data":[{"type":"model","id":"claude-opus-5-5","display_name":"Claude Opus 5.5","created_at":"2026-10-01T00:00:00Z"}],"has_more":false,"first_id":"claude-opus-5-5","last_id":"claude-opus-5-5"}"#,
        )
        .unwrap();
        assert!(!page.has_more);
        assert_eq!(
            serde_json::to_value(&page.data).unwrap(),
            serde_json::json!([{ "id": "claude-opus-5-5", "displayName": "Claude Opus 5.5" }])
        );
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
