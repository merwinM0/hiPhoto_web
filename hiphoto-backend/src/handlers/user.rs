use axum::{
    extract::State,
    Extension,
    Json,
};
use sqlx::SqlitePool;
use crate::config::Config;

use crate::error::Result;
use crate::services::auth::AuthUser;
use crate::models::{UpdateProfileRequest, User, UserResponse};

pub async fn get_profile(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<UserResponse>> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE id = ?"
    )
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(UserResponse::from(user)))
}

pub async fn update_profile(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Json(payload): Json<UpdateProfileRequest>,
) -> Result<Json<UserResponse>> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE id = ?"
    )
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    let username = payload.username.or(user.username);
    let bio = payload.bio.or(user.bio);

    sqlx::query(
        "UPDATE users SET username = ?, bio = ? WHERE id = ?"
    )
    .bind(&username)
    .bind(&bio)
    .bind(&auth_user.user_id)
    .execute(&pool)
    .await?;

    let updated_user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE id = ?"
    )
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(UserResponse::from(updated_user)))
}
