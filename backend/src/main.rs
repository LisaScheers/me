use std::{env, net::Ipv4Addr, path::PathBuf};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let path =
        PathBuf::from(env::var("COUNTER_DB").unwrap_or_else(|_| ".data/views.sqlite3".into()));
    if let Some(parent) = path.parent().filter(|p| !p.as_os_str().is_empty()) {
        std::fs::create_dir_all(parent)?;
    }
    let origin = env::var("SITE_ORIGIN").unwrap_or_else(|_| "http://127.0.0.1:8789".into());
    let port: u16 = env::var("PORT").unwrap_or_else(|_| "8790".into()).parse()?;
    let pool = me_backend::database(&path).await?;
    let listener = tokio::net::TcpListener::bind((Ipv4Addr::LOCALHOST, port)).await?;
    axum::serve(listener, me_backend::app(pool.clone(), origin))
        .with_graceful_shutdown(shutdown())
        .await?;
    pool.close().await;
    Ok(())
}

async fn shutdown() {
    #[cfg(unix)]
    {
        let mut terminate =
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
                .expect("install SIGTERM handler");
        tokio::select! {
            _ = tokio::signal::ctrl_c() => {},
            _ = terminate.recv() => {},
        }
    }
    #[cfg(not(unix))]
    let _ = tokio::signal::ctrl_c().await;
}
