use axum::{
    Router,
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use tower::ServiceExt;

async fn request(
    app: Router,
    method: &str,
    origin: Option<&str>,
    marker: bool,
    body: &str,
) -> (StatusCode, Value) {
    let mut request = Request::builder().uri("/api/views").method(method);
    if let Some(origin) = origin {
        request = request.header("origin", origin);
    }
    if marker {
        request = request.header("x-page-view", "1");
    }
    request = request.header("content-length", body.len());
    let response = app
        .oneshot(request.body(Body::from(body.to_owned())).unwrap())
        .await
        .unwrap();
    assert_eq!(response.headers()["cache-control"], "no-store");
    assert!(!response.headers().contains_key("set-cookie"));
    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    (status, serde_json::from_slice(&body).unwrap())
}

#[tokio::test]
async fn migrates_existing_database_and_preserves_total_across_restart() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("views.sqlite3");
    // Exact schema used by the previous Python service, without SQLx metadata.
    let legacy = sqlx::SqlitePool::connect_with(
        sqlx::sqlite::SqliteConnectOptions::new()
            .filename(&path)
            .create_if_missing(true),
    )
    .await
    .unwrap();
    sqlx::query(
        "CREATE TABLE counter (id INTEGER PRIMARY KEY CHECK(id=1), views INTEGER NOT NULL)",
    )
    .execute(&legacy)
    .await
    .unwrap();
    sqlx::query("INSERT INTO counter VALUES (1, 41)")
        .execute(&legacy)
        .await
        .unwrap();
    legacy.close().await;
    let pool = me_backend::database(&path).await.unwrap();
    let app = me_backend::app(pool.clone(), "https://bylisa.dev".into());
    assert_eq!(
        request(app.clone(), "GET", None, false, "").await,
        (StatusCode::OK, json!({"views":41}))
    );
    assert_eq!(
        request(app, "POST", Some("https://bylisa.dev"), true, "").await,
        (StatusCode::OK, json!({"views":42}))
    );
    pool.close().await;
    let reopened = me_backend::database(&path).await.unwrap();
    assert_eq!(
        request(
            me_backend::app(reopened.clone(), "https://bylisa.dev".into()),
            "GET",
            None,
            false,
            ""
        )
        .await
        .1,
        json!({"views":42})
    );
    reopened.close().await;
}

#[tokio::test]
async fn concurrent_increments_are_atomic() {
    let dir = tempfile::tempdir().unwrap();
    let pool = me_backend::database(&dir.path().join("views.sqlite3"))
        .await
        .unwrap();
    let app = me_backend::app(pool.clone(), "https://bylisa.dev".into());
    let mut tasks = tokio::task::JoinSet::new();
    for _ in 0..32 {
        let app = app.clone();
        tasks
            .spawn(async move { request(app, "POST", Some("https://bylisa.dev"), true, "").await });
    }
    let mut totals = Vec::new();
    while let Some(result) = tasks.join_next().await {
        let (status, body) = result.unwrap();
        assert_eq!(status, StatusCode::OK);
        totals.push(body["views"].as_i64().unwrap());
    }
    totals.sort();
    assert_eq!(totals, (1..=32).collect::<Vec<_>>());
    pool.close().await;
}

#[tokio::test]
async fn rejects_invalid_writes_and_reports_database_failure() {
    let dir = tempfile::tempdir().unwrap();
    let pool = me_backend::database(&dir.path().join("views.sqlite3"))
        .await
        .unwrap();
    let app = me_backend::app(pool.clone(), "https://bylisa.dev".into());
    for (origin, marker) in [
        (None, true),
        (Some("https://example.com"), true),
        (Some("https://bylisa.dev"), false),
    ] {
        assert_eq!(
            request(app.clone(), "POST", origin, marker, "").await.0,
            StatusCode::FORBIDDEN
        );
    }
    assert_eq!(
        request(app.clone(), "POST", Some("https://bylisa.dev"), true, "{}")
            .await
            .0,
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        request(app.clone(), "GET", None, false, "").await.1,
        json!({"views":0})
    );
    pool.close().await;
    assert_eq!(
        request(app, "POST", Some("https://bylisa.dev"), true, "")
            .await
            .0,
        StatusCode::SERVICE_UNAVAILABLE
    );
}
