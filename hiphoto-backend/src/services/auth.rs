use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use crate::utils::jwt::verify_token;
use crate::config::Config;
use crate::error::AppError;

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: String,
    pub email: String,
}

pub async fn auth_middleware(
    State(config): State<Config>,
    mut request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = request
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| AppError::Auth("Missing authorization header".to_string()))?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| AppError::Auth("Invalid authorization header format".to_string()))?;

    let claims = verify_token(token, &config.jwt_secret)?;

    request.extensions_mut().insert(AuthUser {
        user_id: claims.sub,
        email: claims.email,
    });

    Ok(next.run(request).await)
}
