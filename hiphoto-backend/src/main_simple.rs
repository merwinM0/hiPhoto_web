use axum::{
    routing::get,
    Router,
};
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 创建简单的路由
    let app = Router::new()
        .route("/", get(|| async { "Hello from HiPhoto Backend!" }))
        .route("/health", get(|| async { "OK" }))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        );

    // 启动服务器
    let addr = "0.0.0.0:3000";
    let listener = tokio::net::TcpListener::bind(addr).await?;
    println!("Server running on http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}