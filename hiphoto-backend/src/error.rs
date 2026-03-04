=== src/error.rs ===
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("数据库错误: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("认证失败: {0}")]
    Auth(String),
    
    #[error("未找到资源: {0}")]
    NotFound(String),
    
    #[error("验证错误: {0}")]
    Validation(String),
    
    #[error("内部错误: {0}")]
    Internal(#[from] anyhow::Error),
    
    #[error("邮件发送失败: {0}")]
    Email(String),
    
    #[error("图片处理失败: {0}")]
    Image(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::Database(e) => {
                if let sqlx::Error::RowNotFound = e {
                    (StatusCode::NOT_FOUND, "资源不存在".to_string())
                } else {
                    (StatusCode::INTERNAL_SERVER_ERROR, format!("数据库错误: {}", e))
                }
            }
            AppError::Auth(msg) => (StatusCode::UNAUTHORIZED, msg),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::Validation(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::Internal(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            AppError::Email(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::Image(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        let body = Json(json!({
            "error": message,
        }));

        (status, body).into_response()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;

