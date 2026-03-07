use axum::{
    Router,
    middleware::from_fn_with_state,
    routing::{delete, get, post, put},
};
use sqlx::SqlitePool;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::util::SubscriberInitExt;

mod config;
mod db;
mod error;
mod handlers;
mod middleware;
mod models;
mod services;
mod utils;

use config::Config;
use handlers::{auth, photo, room, score, tag, user};
use services::cleanup;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 初始化日志
    tracing_subscriber::fmt::init();

    // 加载配置
    let config = Config::from_env()?;
    tracing::info!("Loaded configuration");

    // 初始化数据库
    let pool = db::init_db(&config.database_url).await?;
    tracing::info!("Database initialized");

    // 注意：Redis自动处理验证码过期，无需定时清理
    // cleanup::start_cleanup_task(pool.clone());

    // 创建路由
    let app = create_app(pool, config);

    // 启动服务器
    let addr = "0.0.0.0:8000";
    let listener = tokio::net::TcpListener::bind(addr).await?;
    tracing::info!("Server running on http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

fn create_app(pool: SqlitePool, config: Config) -> Router {
    // 公开路由（无需认证）
    let public_routes = Router::new()
        .route("/api/auth/send-code", post(auth::send_verification_code))
        .route("/api/auth/register", post(auth::register))
        .route("/api/auth/verify", post(auth::verify_email))
        .route("/api/auth/login", post(auth::login))
        .route("/api/auth/resend", post(auth::resend_verification))
        .with_state((pool.clone(), config.clone()));

    // 需要认证的路由
    let protected_routes = Router::new()
        // 用户相关
        .route("/api/user/profile", get(user::get_profile))
        .route("/api/user/profile", put(user::update_profile))
        // 房间相关
        .route("/api/rooms", get(room::get_rooms))
        .route("/api/rooms", post(room::create_room))
        .route("/api/rooms/:room_id", get(room::get_room))
        .route("/api/rooms/:room_id", put(room::update_room))
        .route("/api/rooms/join", post(room::join_room))
        .route("/api/rooms/:room_id/members", get(room::get_room_members))
        .route(
            "/api/rooms/:room_id/members/:user_id",
            delete(room::kick_member),
        )
        .route("/api/rooms/:room_id/leave", post(room::leave_room))
        // 图片相关
        .route("/api/rooms/:room_id/photos", get(photo::get_room_photos))
        .route("/api/rooms/:room_id/photos", post(photo::upload_photo))
        .route("/api/photos/:photo_id", get(photo::get_photo))
        .route("/api/photos/:photo_id", delete(photo::delete_photo))
        // 标签相关
        .route("/api/tags", post(tag::create_tag))
        .route("/api/tags/:tag_id", delete(tag::delete_tag))
        .route("/api/photos/:photo_id/tags", get(tag::get_photo_tags))
        // 评分相关
        .route("/api/scores", post(score::submit_score))
        .route("/api/rooms/:room_id/scoreboard", get(score::get_scoreboard))
        .route("/api/rooms/:room_id/end-round", post(score::end_round))
        .route(
            "/api/rooms/:room_id/new-round",
            post(score::start_new_round),
        )
        .layer(from_fn_with_state(
            config.clone(),
            crate::services::auth::auth_middleware,
        ))
        .with_state((pool.clone(), config.clone()));

    // 合并路由
    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
}
