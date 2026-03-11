use axum::{
    extract::{Path, State},
    Extension,
    Json,
};
use sqlx::SqlitePool;

use crate::config::Config;
use crate::error::{AppError, Result};
use crate::services::auth::AuthUser;
use crate::models::{Photo, PhotoResponse, PhotoDetailResponse, UploadPhotoRequest, Tag, TagResponse};
use crate::services::image::process_image;

pub async fn upload_photo(
    State((pool, config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Path(room_id): Path<String>,
    Json(payload): Json<UploadPhotoRequest>,
) -> Result<Json<PhotoResponse>> {
    // 验证成员身份
    let is_member: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM room_members WHERE room_id = ? AND user_id = ? AND status = 'approved'"
    )
    .bind(&room_id)
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    if !is_member {
        return Err(AppError::Auth("Not an approved member of this room".to_string()));
    }

    // 检查上传限制
    let upload_limit: i32 = sqlx::query_scalar(
        "SELECT upload_limit FROM rooms WHERE id = ?"
    )
    .bind(&room_id)
    .fetch_one(&pool)
    .await?;

    let uploaded_count: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM photos WHERE room_id = ? AND uploader_id = ?"
    )
    .bind(&room_id)
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    if uploaded_count >= upload_limit {
        return Err(AppError::Validation(format!("Upload limit ({}) reached", upload_limit)));
    }

    // 处理图片
    let processed = process_image(
        &payload.image_base64,
        config.max_image_width,
        config.max_image_height,
        config.image_quality,
    )?;

    let photo = Photo::new(
        room_id.clone(),
        auth_user.user_id.clone(),
        processed.image_base64,
        processed.thumbnail_base64,
        processed.width,
        processed.height,
    );

    // 保存到数据库
    sqlx::query(
        "INSERT INTO photos (id, room_id, uploader_id, image_base64, thumbnail_base64, width, height, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&photo.id)
    .bind(&photo.room_id)
    .bind(&photo.uploader_id)
    .bind(&photo.image_base64)
    .bind(&photo.thumbnail_base64)
    .bind(photo.width)
    .bind(photo.height)
    .bind(&photo.created_at)
    .execute(&pool)
    .await?;

    // 获取上传者用户名
    let uploader_name: Option<String> = sqlx::query_scalar(
        "SELECT username FROM users WHERE id = ?"
    )
    .bind(&auth_user.user_id)
    .fetch_optional(&pool)
    .await?
    .flatten();

    Ok(Json(PhotoResponse {
        id: photo.id,
        room_id: photo.room_id,
        uploader_id: photo.uploader_id,
        uploader_name,
        thumbnail_base64: photo.thumbnail_base64,
        width: photo.width,
        height: photo.height,
        created_at: photo.created_at,
        tags: vec![],
    }))
}

pub async fn get_room_photos(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Path(room_id): Path<String>,
) -> Result<Json<Vec<PhotoResponse>>> {
    // 验证成员身份
    let is_member: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM room_members WHERE room_id = ? AND user_id = ? AND status = 'approved'"
    )
    .bind(&room_id)
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    if !is_member {
        return Err(AppError::Auth("Not an approved member of this room".to_string()));
    }

    let photos = sqlx::query_as::<_, Photo>(
        "SELECT * FROM photos WHERE room_id = ? ORDER BY created_at DESC"
    )
    .bind(&room_id)
    .fetch_all(&pool)
    .await?;

    let mut responses = Vec::new();
    for photo in photos {
        let uploader_name: Option<String> = sqlx::query_scalar(
            "SELECT username FROM users WHERE id = ?"
        )
        .bind(&photo.uploader_id)
        .fetch_optional(&pool)
        .await?
        .flatten();

        let tags = sqlx::query_as::<_, Tag>(
            "SELECT * FROM tags WHERE photo_id = ?"
        )
        .bind(&photo.id)
        .fetch_all(&pool)
        .await?;

        let tag_responses: Vec<TagResponse> = tags.into_iter().map(|t| {
            let mut tr: TagResponse = t.into();
            // 获取标签创建者用户名
            tr
        }).collect();

        responses.push(PhotoResponse {
            id: photo.id,
            room_id: photo.room_id,
            uploader_id: photo.uploader_id,
            uploader_name,
            thumbnail_base64: photo.thumbnail_base64,
            width: photo.width,
            height: photo.height,
            created_at: photo.created_at,
            tags: tag_responses,
        });
    }

    Ok(Json(responses))
}

pub async fn get_photo(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Path(photo_id): Path<String>,
) -> Result<Json<PhotoDetailResponse>> {
    let photo = sqlx::query_as::<_, Photo>(
        "SELECT * FROM photos WHERE id = ?"
    )
    .bind(&photo_id)
    .fetch_one(&pool)
    .await?;

    // 验证成员身份（必须是已批准的成员）
    let is_approved_member: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM room_members WHERE room_id = ? AND user_id = ? AND status = 'approved'"
    )
    .bind(&photo.room_id)
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    if !is_approved_member {
        return Err(AppError::Auth("Not an approved member of this room".to_string()));
    }

    let uploader_name: Option<String> = sqlx::query_scalar(
        "SELECT username FROM users WHERE id = ?"
    )
    .bind(&photo.uploader_id)
    .fetch_optional(&pool)
    .await?
    .flatten();

    let tags = sqlx::query_as::<_, Tag>(
        "SELECT * FROM tags WHERE photo_id = ?"
    )
    .bind(&photo_id)
    .fetch_all(&pool)
    .await?;

    // 获取每个标签创建者的用户名
    let mut tag_responses = Vec::new();
    for tag in tags {
        let creator_name: Option<String> = sqlx::query_scalar(
            "SELECT username FROM users WHERE id = ?"
        )
        .bind(&tag.creator_id)
        .fetch_optional(&pool)
        .await?
        .flatten();

        tag_responses.push(TagResponse {
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

    // 获取评分（待实现）
    let scores = vec![];

    Ok(Json(PhotoDetailResponse {
        id: photo.id,
        room_id: photo.room_id,
        uploader_id: photo.uploader_id,
        uploader_name,
        image_base64: photo.image_base64,
        width: photo.width,
        height: photo.height,
        created_at: photo.created_at,
        tags: tag_responses,
        scores,
    }))
}

pub async fn delete_photo(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Path(photo_id): Path<String>,
) -> Result<Json<serde_json::Value>> {
    let photo = sqlx::query_as::<_, Photo>(
        "SELECT * FROM photos WHERE id = ?"
    )
    .bind(&photo_id)
    .fetch_one(&pool)
    .await?;

    // 检查权限：房主或上传者
    let room = sqlx::query_as::<_, crate::models::Room>(
        "SELECT * FROM rooms WHERE id = ?"
    )
    .bind(&photo.room_id)
    .fetch_one(&pool)
    .await?;

    if photo.uploader_id != auth_user.user_id && room.owner_id != auth_user.user_id {
        return Err(AppError::Auth("Not authorized to delete this photo".to_string()));
    }

    // 删除相关标签和评分
    sqlx::query("DELETE FROM tags WHERE photo_id = ?")
        .bind(&photo_id)
        .execute(&pool)
        .await?;

    sqlx::query("DELETE FROM scores WHERE photo_id = ?")
        .bind(&photo_id)
        .execute(&pool)
        .await?;

    // 删除图片
    sqlx::query("DELETE FROM photos WHERE id = ?")
        .bind(&photo_id)
        .execute(&pool)
        .await?;

    Ok(Json(serde_json::json!({
        "message": "Photo deleted successfully"
    })))
}
