use axum::{
    extract::State,
    Json,
};
use sqlx::SqlitePool;
use serde_json::json;

use crate::config::Config;
use crate::error::{AppError, Result};
use crate::models::RegisterRequest;

pub async fn register(
    State((pool, config)): State<(SqlitePool, Config)>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<serde_json::Value>> {
    Ok(Json(json!({
        "message": "Registration endpoint",
        "email": payload.email
    })))
}

pub async fn verify_email(
    State((pool, _)): State<(SqlitePool, Config)>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>> {
    Ok(Json(json!({
        "message": "Verify email endpoint"
    })))
}

pub async fn login(
    State((pool, config)): State<(SqlitePool, Config)>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>> {
    Ok(Json(json!({
        "message": "Login endpoint",
        "token": "test-token"
    })))
}

pub async fn resend_verification(
    State((pool, config)): State<(SqlitePool, Config)>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>> {
    Ok(Json(json!({
        "message": "Resend verification endpoint"
    })))
}