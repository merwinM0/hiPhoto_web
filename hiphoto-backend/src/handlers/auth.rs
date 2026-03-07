use axum::{Json, extract::State};
use serde_json::json;
use sqlx::SqlitePool;
use chrono::Utc;

use crate::config::Config;
use crate::error::{AppError, Result};
use crate::models::{LoginRequest, RegisterRequest, ResendVerificationRequest, VerifyEmailRequest, SendCodeRequest};
use crate::services::{auth, email, redis::RedisService};

pub async fn send_verification_code(
    State((pool, config)): State<(SqlitePool, Config)>,
    Json(payload): Json<SendCodeRequest>,
) -> Result<Json<serde_json::Value>> {
    // 检查邮箱是否已注册
    let existing_user: Option<(String,)> = sqlx::query_as("SELECT id FROM users WHERE email = ?")
        .bind(&payload.email)
        .fetch_optional(&pool)
        .await?;

    if existing_user.is_some() {
        return Err(AppError::Auth("Email already registered".to_string()));
    }

    // 生成验证码
    let verification_code = email::generate_verification_code();

    // 使用Redis存储验证码
    let redis_service = RedisService::new(&config.redis_url)?;
    redis_service.set_verification_code(&payload.email, &verification_code, config.verification_code_ttl).await?;
    
    tracing::info!("Set verification code for {} in Redis (TTL: {}s)", payload.email, config.verification_code_ttl);

    // 发送验证邮件
    let email_service = email::EmailService::new(config.clone());
    email_service.send_verification_email(&payload.email, &verification_code).await?;

    Ok(Json(json!({
        "message": "Verification code sent successfully",
        "email": payload.email
    })))
}

pub async fn register(
    State((pool, config)): State<(SqlitePool, Config)>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<serde_json::Value>> {
    // 检查邮箱是否已注册
    let existing_user: Option<(String,)> = sqlx::query_as("SELECT id FROM users WHERE email = ?")
        .bind(&payload.email)
        .fetch_optional(&pool)
        .await?;

    if existing_user.is_some() {
        return Err(AppError::Auth("Email already registered".to_string()));
    }

    // 验证验证码
    let redis_service = RedisService::new(&config.redis_url)?;
    let is_valid = redis_service.check_verification_code(&payload.email, &payload.code).await?;

    if !is_valid {
        return Err(AppError::Auth("Invalid or expired verification code".to_string()));
    }
    
    // 验证码正确，删除验证码记录
    redis_service.delete_verification_code(&payload.email).await?;

    // 哈希密码
    let password_hash = auth::hash_password(&payload.password)?;

    // 创建用户（已验证）
    let user_id = uuid::Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO users (id, email, password_hash, is_verified, created_at) 
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&user_id)
    .bind(&payload.email)
    .bind(&password_hash)
    .bind(1) // is_verified = true
    .bind(&created_at)
    .execute(&pool)
    .await?;

    Ok(Json(json!({
        "message": "Registration successful",
        "email": payload.email,
        "user_id": user_id
    })))
}

pub async fn verify_email(
    State((pool, config)): State<(SqlitePool, Config)>,
    Json(payload): Json<VerifyEmailRequest>,
) -> Result<Json<serde_json::Value>> {
    // 查找用户
    let user: Option<(String, i32)> =
        sqlx::query_as("SELECT id, is_verified FROM users WHERE email = ?")
            .bind(&payload.email)
            .fetch_optional(&pool)
            .await?;

    match user {
        Some((user_id, is_verified)) => {
            // 检查是否已验证
            if is_verified == 1 {
                return Err(AppError::Auth("Email already verified".to_string()));
            }

            // 使用Redis验证验证码
            let redis_service = RedisService::new(&config.redis_url)?;
            let is_valid = redis_service.check_verification_code(&payload.email, &payload.code).await?;

            if !is_valid {
                return Err(AppError::Auth("Invalid or expired verification code".to_string()));
            }
            
            // 验证成功，更新用户状态并删除验证码
            sqlx::query("UPDATE users SET is_verified = 1 WHERE id = ?")
                .bind(&user_id)
                .execute(&pool)
                .await?;
            
            redis_service.delete_verification_code(&payload.email).await?;

            Ok(Json(json!({
                "message": "Email verified successfully",
                "email": payload.email,
                "user_id": user_id
            })))
        }
        None => Err(AppError::Auth("User not found".to_string())),
    }
}

pub async fn login(
    State((pool, config)): State<(SqlitePool, Config)>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<serde_json::Value>> {
    // 查找用户
    let user: Option<(String, String, String, i32)> =
        sqlx::query_as("SELECT id, email, password_hash, is_verified FROM users WHERE email = ?")
            .bind(&payload.email)
            .fetch_optional(&pool)
            .await?;

    match user {
        Some((user_id, email, password_hash, is_verified)) => {
            // 验证密码
            let password_valid = auth::verify_password(&payload.password, &password_hash)?;

            if !password_valid {
                return Err(AppError::Auth("Invalid password".to_string()));
            }

            // 检查邮箱是否已验证
            if is_verified != 1 {
                return Err(AppError::Auth(
                    "Email not verified. Please verify your email first.".to_string(),
                ));
            }

            // 创建JWT token
            let token = crate::utils::jwt::create_token(
                &user_id,
                &email,
                &config.jwt_secret,
                config.jwt_expiration,
            )?;

            Ok(Json(json!({
                "message": "Login successful",
                "token": token,
                "user_id": user_id,
                "email": email
            })))
        }
        None => Err(AppError::Auth("User not found".to_string())),
    }
}

pub async fn resend_verification(
    State((pool, config)): State<(SqlitePool, Config)>,
    Json(payload): Json<ResendVerificationRequest>,
) -> Result<Json<serde_json::Value>> {
    // 查找用户
    let user: Option<(String, i32)> =
        sqlx::query_as("SELECT id, is_verified FROM users WHERE email = ?")
            .bind(&payload.email)
            .fetch_optional(&pool)
            .await?;

    match user {
        Some((_user_id, is_verified)) => {
            // 检查是否已验证
            if is_verified == 1 {
                return Err(AppError::Auth("Email already verified".to_string()));
            }

            // 生成新的验证码
            let verification_code = email::generate_verification_code();

            // 使用Redis存储验证码（覆盖旧的）
            let redis_service = RedisService::new(&config.redis_url)?;
            redis_service.set_verification_code(&payload.email, &verification_code, config.verification_code_ttl).await?;

            // 发送验证邮件
            let email_service = email::EmailService::new(config.clone());
            email_service.send_verification_email(&payload.email, &verification_code)
                .await?;

            Ok(Json(json!({
                "message": "Verification code resent successfully",
                "email": payload.email
            })))
        }
        None => Err(AppError::Auth("User not found".to_string())),
    }
}
