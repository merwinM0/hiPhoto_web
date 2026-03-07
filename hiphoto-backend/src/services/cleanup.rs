use sqlx::SqlitePool;
use tracing::info;
use chrono::Utc;

/// 清理过期的验证码
pub async fn cleanup_expired_verification_codes(pool: &SqlitePool) -> anyhow::Result<()> {
    let now = Utc::now().to_rfc3339();
    
    let result = sqlx::query("DELETE FROM verification_codes WHERE expires_at <= ?")
        .bind(&now)
        .execute(pool)
        .await?;
    
    if result.rows_affected() > 0 {
        info!("Cleaned up {} expired verification codes", result.rows_affected());
    }
    
    Ok(())
}

/// 启动定时清理任务
pub async fn start_cleanup_task(pool: SqlitePool) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(3600)); // 每小时清理一次
        
        loop {
            interval.tick().await;
            
            if let Err(e) = cleanup_expired_verification_codes(&pool).await {
                tracing::error!("Failed to cleanup expired verification codes: {}", e);
            }
        }
    });
}