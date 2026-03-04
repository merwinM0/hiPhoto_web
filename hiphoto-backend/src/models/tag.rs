use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Tag {
    pub id: String,
    pub photo_id: String,
    pub creator_id: String,
    pub x: f64,
    pub y: f64,
    pub content: String,
    pub created_at: String,
}

impl Tag {
    pub fn new(photo_id: String, creator_id: String, x: f64, y: f64, content: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            photo_id,
            creator_id,
            x,
            y,
            content,
            created_at: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateTagRequest {
    pub photo_id: String,
    pub x: f64,
    pub y: f64,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct TagResponse {
    pub id: String,
    pub photo_id: String,
    pub creator_id: String,
    pub creator_name: Option<String>,
    pub x: f64,
    pub y: f64,
    pub content: String,
    pub created_at: String,
}

impl From<Tag> for TagResponse {
    fn from(tag: Tag) -> Self {
        Self {
            id: tag.id,
            photo_id: tag.photo_id,
            creator_id: tag.creator_id,
            creator_name: None,
            x: tag.x,
            y: tag.y,
            content: tag.content,
            created_at: tag.created_at,
        }
    }
}
