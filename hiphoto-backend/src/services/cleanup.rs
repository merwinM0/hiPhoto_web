use sqlx::SqlitePool;
use tracing::info;
use chrono::Utc;

/// 清理过期的验证码（已废弃，Redis自动处理过期）
#[deprecated(note = "Redis automatically expires verification codes, no cleanup needed")]
pub async fn cleanup_expired_verification_codes(_pool: &SqlitePool) -> anyhow::Result<()> {
    // Redis自动处理验证码过期，无需清理
    Ok(())
}

/// 启动定时清理任务（已废弃，Redis自动处理过期）
#[deprecated(note = "Redis automatically expires verification codes, no cleanup needed")]
pub async fn start_cleanup_task(_pool: SqlitePool) {
    // Redis自动处理验证码过期，无需定时清理
    info!("Redis verification codes auto-expire, cleanup task disabled");
}