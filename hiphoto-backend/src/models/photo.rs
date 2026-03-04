use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Photo {
    pub id: String,
    pub room_id: String,
    pub uploader_id: String,
    pub image_base64: String,
    pub thumbnail_base64: String,
    pub width: i32,
    pub height: i32,
    pub created_at: String,
}

impl Photo {
    pub fn new(
        room_id: String,
        uploader_id: String,
        image_base64: String,
        thumbnail_base64: String,
        width: u32,
        height: u32,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            room_id,
            uploader_id,
            image_base64,
            thumbnail_base64,
            width: width as i32,
            height: height as i32,
            created_at: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct UploadPhotoRequest {
    pub image_base64: String,
}

#[derive(Debug, Serialize)]
pub struct PhotoResponse {
    pub id: String,
    pub room_id: String,
    pub uploader_id: String,
    pub uploader_name: Option<String>,
    pub thumbnail_base64: String,
    pub width: i32,
    pub height: i32,
    pub created_at: String,
    pub tags: Vec<TagResponse>,
}

#[derive(Debug, Serialize)]
pub struct PhotoDetailResponse {
    pub id: String,
    pub room_id: String,
    pub uploader_id: String,
    pub uploader_name: Option<String>,
    pub image_base64: String,
    pub width: i32,
    pub height: i32,
    pub created_at: String,
    pub tags: Vec<TagResponse>,
    pub scores: Vec<ScoreResponse>,
}

use crate::models::{ScoreResponse, TagResponse};
