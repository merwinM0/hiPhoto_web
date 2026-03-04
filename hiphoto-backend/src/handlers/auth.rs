use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use sqlx::SqlitePool;
use argon2::{self, Config, ThreadMode, Variant, Version};
use rand::Rng;
use serde_json::json;

use crate::config::Config;
use crate::error::{AppError, Result};
use crate::models::{RegisterRequest, LoginRequest, VerifyEmailRequest, User, UserResponse};
use crate::services::email::{send_verification_email, generate_verification_code};
use crate::utils::jwt::create_token;

pub async fn register(
    State(pool): State<SqlitePool>,
    State(config): State<Config>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<serde_json::Value>> {
    // 验证邮箱格式
    if !payload.email.contains('@') {
        return Err(AppError::Validation("Invalid email format".to_string()));
    }

    // 验证密码长度
    if payload.password.len() < 6 {
        return Err(AppError::Validation("Password must be at least 6 characters".to_string()));
    }

    // 检查邮箱是否已存在
    let existing = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE email = ?"
    )
    .bind(&payload.email)
    .fetch_optional(&pool)
    .await?;

    if existing.is_some() {
        return Err(AppError::Validation("Email already registered".to_string()));
    }

    // 哈希密码
    let salt = rand::thread_rng().gen::<[u8; 16]>();
    let config = argon2::Config {
        variant: Variant::Argon2id,
        version: Version::Version13,
        mem_cost: 65536,
        time_cost: 3,
        lanes: 4,
        thread_mode: ThreadMode::Parallel,
        secret: &[],
        ad: &[],
        hash_length: 32,
    };
    let password_hash = argon2::hash_encoded(
        payload.password.as_bytes(),
        &salt,
        &config,
    ).map_err(|e| AppError::Internal(anyhow::anyhow!("Password hash failed: {}", e)))?;

    // 生成验证码
    let verification_code = generate_verification_code();

    // 创建用户
    let user = User::new(payload.email.clone(), password_hash);
    
    sqlx::query(
        "INSERT INTO users (id, email, password_hash, username, bio, is_verified, verification_code, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&user.id)
    .bind(&user.email)
    .bind(&user.password_hash)
    .bind(&user.username)
    .bind(&user.bio)
    .bind(user.is_verified)
    .bind(&verification_code)
    .bind(&user.created_at)
    .execute(&pool)
    .await?;

    // 发送验证邮件
    send_verification_email(&payload.email, &verification_code, &config).await?;

    Ok(Json(json!({
        "message": "Registration successful. Please check your email for verification code.",
        "email": payload.email
    })))
}

pub async fn verify_email(
    State(pool): State<SqlitePool>,
    Json(payload): Json<VerifyEmailRequest>,
) -> Result<Json<serde_json::Value>> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE email = ?"
    )
    .bind(&payload.email)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    if user.is_verified == 1 {
        return Ok(Json(json!({
            "message": "Email already verified"
        })));
    }

    match user.verification_code {
        Some(ref code) if code == &payload.code => {
            sqlx::query(
                "UPDATE users SET is_verified = 1, verification_code = NULL WHERE email = ?"
            )
            .bind(&payload.email)
            .execute(&pool)
            .await?;

            Ok(Json(json!({
                "message": "Email verified successfully"
            })))
        }
        _ => Err(AppError::Validation("Invalid verification code".to_string())),
    }
}

pub async fn login(
    State(pool): State<SqlitePool>,
    State(config): State<Config>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<serde_json::Value>> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE email = ?"
    )
    .bind(&payload.email)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::Auth("Invalid email or password".to_string()))?;

    if user.is_verified == 0 {
        return Err(AppError::Auth("Please verify your email first".to_string()));
    }

    // 验证密码
    let valid = argon2::verify_encoded(&user.password_hash, payload.password.as_bytes())
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Password verify failed: {}", e)))?;

    if !valid {
        return Err(AppError::Auth("Invalid email or password".to_string()));
    }

    // 生成 token
    let token = create_token(&user.id, &user.email, &config.jwt_secret, config.jwt_expiration)?;

    Ok(Json(json!({
        "token": token,
        "user": UserResponse::from(user)
    })))
}

pub async fn resend_verification(
    State(pool): State<SqlitePool>,
    State(config): State<Config>,
    Json(payload): Json<VerifyEmailRequest>,
) -> Result<Json<serde_json::Value>> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE email = ?"
    )
    .bind(&payload.email)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    if user.is_verified == 1 {
        return Ok(Json(json!({
            "message": "Email already verified"
        })));
    }

    let new_code = generate_verification_code();

    sqlx::query(
        "UPDATE users SET verification_code = ? WHERE email = ?"
    )
    .bind(&new_code)
    .bind(&payload.email)
    .execute(&pool)
    .await?;

    send_verification_email(&payload.email, &new_code, &config).await?;

    Ok(Json(json!({
        "message": "Verification code sent"
    })))
}
