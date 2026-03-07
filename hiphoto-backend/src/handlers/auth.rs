use axum::{Json, extract::State};
use serde_json::json;
use sqlx::SqlitePool;
use chrono::{Utc, Duration};

use crate::config::Config;
use crate::error::{AppError, Result};
use crate::models::{LoginRequest, RegisterRequest, ResendVerificationRequest, VerifyEmailRequest, SendCodeRequest};
use crate::services::{auth, email};

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
    let created_at = Utc::now().to_rfc3339();
    let expires_at = (Utc::now() + Duration::minutes(10)).to_rfc3339();

    // 检查是否存在未过期的验证码
    let existing_code: Option<(String, String)> = sqlx::query_as(
        "SELECT code, expires_at FROM verification_codes WHERE email = ? AND expires_at > ?"
    )
    .bind(&payload.email)
    .bind(&created_at)
    .fetch_optional(&pool)
    .await?;

    if let Some((existing_code, expires_at_str)) = existing_code {
        // 更新验证码
        sqlx::query(
            "UPDATE verification_codes SET code = ?, created_at = ?, expires_at = ? WHERE email = ?"
        )
        .bind(&verification_code)
        .bind(&created_at)
        .bind(&expires_at)
        .bind(&payload.email)
        .execute(&pool)
        .await?;
        
        tracing::info!("Updated verification code for {}", payload.email);
    } else {
        // 插入新记录
        sqlx::query(
            "INSERT INTO verification_codes (email, code, created_at, expires_at) VALUES (?, ?, ?, ?)"
        )
        .bind(&payload.email)
        .bind(&verification_code)
        .bind(&created_at)
        .bind(&expires_at)
        .execute(&pool)
        .await?;
        
        tracing::info!("Created new verification code for {}", payload.email);
    }

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
    let now = Utc::now().to_rfc3339();
    let verification: Option<(String, String)> = sqlx::query_as(
        "SELECT code, expires_at FROM verification_codes WHERE email = ? AND expires_at > ?"
    )
    .bind(&payload.email)
    .bind(&now)
    .fetch_optional(&pool)
    .await?;

    match verification {
        Some((stored_code, expires_at)) => {
            if stored_code != payload.code {
                return Err(AppError::Auth("Invalid verification code".to_string()));
            }
            
            // 验证码正确，删除验证码记录
            sqlx::query("DELETE FROM verification_codes WHERE email = ?")
                .bind(&payload.email)
                .execute(&pool)
                .await?;
        }
        None => {
            return Err(AppError::Auth("Verification code expired or not found".to_string()));
        }
    }

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
    State((pool, _config)): State<(SqlitePool, Config)>,
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

            // 使用新的验证码表验证
            let now = Utc::now().to_rfc3339();
            let verification: Option<(String, String)> = sqlx::query_as(
                "SELECT code, expires_at FROM verification_codes WHERE email = ? AND expires_at > ?"
            )
            .bind(&payload.email)
            .bind(&now)
            .fetch_optional(&pool)
            .await?;

            match verification {
                Some((stored_code, _)) => {
                    if stored_code != payload.code {
                        return Err(AppError::Auth("Invalid verification code".to_string()));
                    }
                    
                    // 验证成功，更新用户状态并删除验证码
                    sqlx::query("UPDATE users SET is_verified = 1 WHERE id = ?")
                        .bind(&user_id)
                        .execute(&pool)
                        .await?;
                    
                    sqlx::query("DELETE FROM verification_codes WHERE email = ?")
                        .bind(&payload.email)
                        .execute(&pool)
                        .await?;

                    Ok(Json(json!({
                        "message": "Email verified successfully",
                        "email": payload.email,
                        "user_id": user_id
                    })))
                }
                None => Err(AppError::Auth("Verification code expired or not found".to_string())),
            }
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
        Some((user_id, is_verified)) => {
            // 检查是否已验证
            if is_verified == 1 {
                return Err(AppError::Auth("Email already verified".to_string()));
            }

            // 生成新的验证码
            let verification_code = email::generate_verification_code();
            let created_at = Utc::now().to_rfc3339();
            let expires_at = (Utc::now() + Duration::minutes(10)).to_rfc3339();

            // 检查是否存在未过期的验证码
            let existing_code: Option<(String, String)> = sqlx::query_as(
                "SELECT code, expires_at FROM verification_codes WHERE email = ? AND expires_at > ?"
            )
            .bind(&payload.email)
            .bind(&created_at)
            .fetch_optional(&pool)
            .await?;

            if let Some((_existing_code, _expires_at_str)) = existing_code {
                // 更新验证码
                sqlx::query(
                    "UPDATE verification_codes SET code = ?, created_at = ?, expires_at = ? WHERE email = ?"
                )
                .bind(&verification_code)
                .bind(&created_at)
                .bind(&expires_at)
                .bind(&payload.email)
                .execute(&pool)
                .await?;
            } else {
                // 插入新记录
                sqlx::query(
                    "INSERT INTO verification_codes (email, code, created_at, expires_at) VALUES (?, ?, ?, ?)"
                )
                .bind(&payload.email)
                .bind(&verification_code)
                .bind(&created_at)
                .bind(&expires_at)
                .execute(&pool)
                .await?;
            }

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
