use axum::{
    extract::{Path, State},
    Extension,
    Json,
};

use sqlx::SqlitePool;

use crate::error::{AppError, Result};
use crate::services::auth::AuthUser;
use crate::models::{CreateTagRequest, Tag, TagResponse, Photo};

pub async fn create_tag(
    State(pool): State<SqlitePool>,
    Extension(auth_user): Extension<AuthUser>,
    Json(payload): Json<CreateTagRequest>,
) -> Result<Json<TagResponse>> {
    // 获取图片信息
    let photo = sqlx::query_as::<_, Photo>(
        "SELECT * FROM photos WHERE id = ?"
    )
    .bind(&payload.photo_id)
    .fetch_one(&pool)
    .await?;

    // 验证成员身份
    let is_member: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM room_members WHERE room_id = ? AND user_id = ?"
    )
    .bind(&photo.room_id)
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    if !is_member {
        return Err(AppError::Auth("Not a member of this room".to_string()));
    }

    // 检查该用户是否已在此图片添加过标签
    let existing_count: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM tags WHERE photo_id = ? AND creator_id = ?"
    )
    .bind(&payload.photo_id)
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    if existing_count >= 1 {
        return Err(AppError::Validation("Each user can only add one tag per photo".to_string()));
    }

    // 验证坐标范围
    if payload.x < 0.0 || payload.x > 1.0 || payload.y < 0.0 || payload.y > 1.0 {
        return Err(AppError::Validation("Tag coordinates must be between 0 and 1".to_string()));
    }

    let tag = Tag::new(
        payload.photo_id.clone(),
        auth_user.user_id.clone(),
        payload.x,
        payload.y,
        payload.content.clone(),
    );

    sqlx::query(
        "INSERT INTO tags (id, photo_id, creator_id, x, y, content, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&tag.id)
    .bind(&tag.photo_id)
    .bind(&tag.creator_id)
    .bind(tag.x)
    .bind(tag.y)
    .bind(&tag.content)
    .bind(&tag.created_at)
    .execute(&pool)
    .await?;

    let creator_name: Option<String> = sqlx::query_scalar(
        "SELECT username FROM users WHERE id = ?"
    )
    .bind(&auth_user.user_id)
    .fetch_optional(&pool)
    .await?
    .flatten();

    Ok(Json(TagResponse {
        id: tag.id,
        photo_id: tag.photo_id,
        creator_id: tag.creator_id,
        creator_name,
        x: tag.x,
        y: tag.y,
        content: tag.content,
        created_at: tag.created_at,
    }))
}

pub async fn delete_tag(
    State(pool): State<SqlitePool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(tag_id): Path<String>,
) -> Result<Json<serde_json::Value>> {
    let tag = sqlx::query_as::<_, Tag>(
        "SELECT * FROM tags WHERE id = ?"
    )
    .bind(&tag_id)
    .fetch_one(&pool)
    .await?;

    // 检查权限：创建者或房主
    let photo = sqlx::query_as::<_, Photo>(
        "SELECT * FROM photos WHERE id = ?"
    )
    .bind(&tag.photo_id)
    .fetch_one(&pool)
    .await?;

    let room: sqlx::Result<crate::models::Room> = sqlx::query_as(
        "SELECT * FROM rooms WHERE id = ?"
    )
    .bind(&photo.room_id)
    .fetch_one(&pool)
    .await;

    let is_owner = match room {
        Ok(r) => r.owner_id == auth_user.user_id,
        Err(_) => false,
    };

    if tag.creator_id != auth_user.user_id && !is_owner {
        return Err(AppError::Auth("Not authorized to delete this tag".to_string()));
    }

    sqlx::query("DELETE FROM tags WHERE id = ?")
        .bind(&tag_id)
        .execute(&pool)
        .await?;

    Ok(Json(serde_json::json!({
        "message": "Tag deleted successfully"
    })))
}

pub async fn get_photo_tags(
    State(pool): State<SqlitePool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(photo_id): Path<String>,
) -> Result<Json<Vec<TagResponse>>> {
    let photo = sqlx::query_as::<_, Photo>(
        "SELECT * FROM photos WHERE id = ?"
    )
    .bind(&photo_id)
    .fetch_one(&pool)
    .await?;

    // 验证成员身份
    let is_member: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM room_members WHERE room_id = ? AND user_id = ?"
    )
    .bind(&photo.room_id)
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    if !is_member {
        return Err(AppError::Auth("Not a member of this room".to_string()));
    }

    let tags = sqlx::query_as::<_, Tag>(
        "SELECT * FROM tags WHERE photo_id = ?"
    )
    .bind(&photo_id)
    .fetch_all(&pool)
    .await?;

    let mut responses = Vec::new();
    for tag in tags {
        let creator_name: Option<String> = sqlx::query_scalar(
            "SELECT username FROM users WHERE id = ?"
        )
        .bind(&tag.creator_id)
        .fetch_optional(&pool)
        .await?
        .flatten();

        responses.push(TagResponse {
            id: tag.id,
            photo_id: tag.photo_id,
            creator_id: tag.creator_id,
            creator_name,
            x: tag.x,
            y: tag.y,
            content: tag.content,
            created_at: tag.created_at,
        });
    }

    Ok(Json(responses))
}
