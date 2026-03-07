use redis::{AsyncCommands, Client};
use crate::error::{AppError, Result};

pub struct RedisService {
    client: Client,
}

impl RedisService {
    pub fn new(redis_url: &str) -> Result<Self> {
        let client = Client::open(redis_url)
            .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis client creation failed: {}", e)))?;
        Ok(Self { client })
    }
    
    pub async fn get_connection(&self) -> Result<redis::aio::Connection> {
        self.client.get_async_connection().await
            .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis connection failed: {}", e)))
    }
    
    /// 设置验证码，设置过期时间（秒）
    pub async fn set_verification_code(&self, email: &str, code: &str, ttl: i64) -> Result<()> {
        let mut conn = self.get_connection().await?;
        
        let key = format!("verification_code:{}", email);
        conn.set_ex(&key, code, ttl as usize).await
            .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis SETEX failed: {}", e)))?;
        
        Ok(())
    }
    
    /// 获取验证码
    pub async fn get_verification_code(&self, email: &str) -> Result<Option<String>> {
        let mut conn = self.get_connection().await?;
        
        let key = format!("verification_code:{}", email);
        let code: Option<String> = conn.get(&key).await
            .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis GET failed: {}", e)))?;
        
        Ok(code)
    }
    
    /// 删除验证码
    pub async fn delete_verification_code(&self, email: &str) -> Result<()> {
        let mut conn = self.get_connection().await?;
        
        let key = format!("verification_code:{}", email);
        conn.del(&key).await
            .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis DEL failed: {}", e)))?;
        
        Ok(())
    }
    
    /// 检查验证码是否存在且未过期
    pub async fn check_verification_code(&self, email: &str, code: &str) -> Result<bool> {
        let stored_code = self.get_verification_code(email).await?;
        Ok(stored_code.map(|c| c == code).unwrap_or(false))
    }
}