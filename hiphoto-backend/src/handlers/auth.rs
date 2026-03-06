use axum::{Json, extract::State};
use serde_json::json;
use sqlx::SqlitePool;

use crate::config::Config;
use crate::error::{AppError, Result};
use crate::models::{LoginRequest, RegisterRequest, ResendVerificationRequest, VerifyEmailRequest};
use crate::services::{auth, email};

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

    // 哈希密码
    let password_hash = auth::hash_password(&payload.password)?;

    // 生成验证码
    let verification_code = email::generate_verification_code();

    // 创建用户
    let user_id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO users (id, email, password_hash, is_verified, verification_code, created_at) 
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&user_id)
    .bind(&payload.email)
    .bind(&password_hash)
    .bind(0) // is_verified = false
    .bind(&verification_code)
    .bind(&created_at)
    .execute(&pool)
    .await?;

    // 发送验证邮件（在测试环境中打印验证码）
    // if config.smtp_host == "smtp.example.com" {
    if config.smtp_host == "smtp.163.com" {
        println!(
            "[TEST] Verification code for {}: {}",
            payload.email, verification_code
        );
    } else {
        email::send_verification_email(&payload.email, &verification_code, &config).await?;
    }

    Ok(Json(json!({
        "message": "Registration successful. Please check your email for verification code.",
        "email": payload.email,
        "user_id": user_id
    })))
}

pub async fn verify_email(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Json(payload): Json<VerifyEmailRequest>,
) -> Result<Json<serde_json::Value>> {
    // 查找用户
    let user: Option<(String, Option<String>, i32)> =
        sqlx::query_as("SELECT id, verification_code, is_verified FROM users WHERE email = ?")
            .bind(&payload.email)
            .fetch_optional(&pool)
            .await?;

    match user {
        Some((user_id, stored_code, is_verified)) => {
            // 检查是否已验证
            if is_verified == 1 {
                return Err(AppError::Auth("Email already verified".to_string()));
            }

            // 检查验证码
            match stored_code {
                Some(code) if code == payload.code => {
                    // 验证成功，更新用户状态
                    sqlx::query(
                        "UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?",
                    )
                    .bind(&user_id)
                    .execute(&pool)
                    .await?;

                    Ok(Json(json!({
                        "message": "Email verified successfully",
                        "email": payload.email,
                        "user_id": user_id
                    })))
                }
                Some(_) => Err(AppError::Auth("Invalid verification code".to_string())),
                None => Err(AppError::Auth(
                    "No verification code found. Please request a new one.".to_string(),
                )),
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
            let new_verification_code = email::generate_verification_code();

            // 更新验证码
            sqlx::query("UPDATE users SET verification_code = ? WHERE id = ?")
                .bind(&new_verification_code)
                .bind(&user_id)
                .execute(&pool)
                .await?;

            // 发送新的验证邮件（在测试环境中打印验证码）
            if config.smtp_host == "smtp.example.com" {
                println!(
                    "[TEST] New verification code for {}: {}",
                    payload.email, new_verification_code
                );
            } else {
                email::send_verification_email(&payload.email, &new_verification_code, &config)
                    .await?;
            }

            Ok(Json(json!({
                "message": "Verification code resent successfully",
                "email": payload.email
            })))
        }
        None => Err(AppError::Auth("User not found".to_string())),
    }
}
