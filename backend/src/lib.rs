use axum::{
    Json, Router,
    extract::State,
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
    routing::get,
};
use serde::Serialize;
use sqlx::{
    ConnectOptions, SqlitePool,
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
};
use std::{path::Path, time::Duration};

#[derive(Clone)]
struct AppState {
    pool: SqlitePool,
    origin: String,
}

pub async fn database(path: &Path) -> Result<SqlitePool, sqlx::Error> {
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(true)
        .busy_timeout(Duration::from_secs(10))
        .disable_statement_logging();
    let pool = SqlitePoolOptions::new()
        .max_connections(4)
        .connect_with(options)
        .await?;
    sqlx::migrate!().run(&pool).await?;
    Ok(pool)
}

pub fn app(pool: SqlitePool, origin: String) -> Router {
    Router::new()
        .route("/api/views", get(read).post(increment))
        .with_state(AppState { pool, origin })
}

#[derive(Serialize)]
struct Views {
    views: i64,
}

fn response(status: StatusCode, body: impl Serialize) -> Response {
    (status, [(header::CACHE_CONTROL, "no-store")], Json(body)).into_response()
}

fn error(status: StatusCode, message: &str) -> Response {
    response(status, serde_json::json!({ "error": message }))
}

fn has_body(headers: &HeaderMap) -> bool {
    headers.contains_key(header::TRANSFER_ENCODING)
        || headers
            .get(header::CONTENT_LENGTH)
            .is_some_and(|value| value != "0")
}

async fn read(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if has_body(&headers) {
        return error(StatusCode::BAD_REQUEST, "No request body expected");
    }
    total(&state.pool, false).await
}

async fn increment(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if headers.get(header::ORIGIN).and_then(|v| v.to_str().ok()) != Some(state.origin.as_str())
        || headers.get("x-page-view").and_then(|v| v.to_str().ok()) != Some("1")
    {
        return error(StatusCode::FORBIDDEN, "Forbidden");
    }
    if has_body(&headers) {
        return error(StatusCode::BAD_REQUEST, "No request body expected");
    }
    total(&state.pool, true).await
}

async fn total(pool: &SqlitePool, increment: bool) -> Response {
    // UPDATE RETURNING is one atomic statement: concurrent loads cannot lose updates.
    let query = if increment {
        "UPDATE counter SET views = views + 1 WHERE id = 1 RETURNING views"
    } else {
        "SELECT views FROM counter WHERE id = 1"
    };
    match sqlx::query_scalar::<_, i64>(query).fetch_one(pool).await {
        Ok(views) => response(StatusCode::OK, Views { views }),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Counter unavailable"),
    }
}
