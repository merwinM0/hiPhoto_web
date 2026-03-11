
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::Utc;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Room {
    pub id: String,
    pub owner_id: String,
    pub invite_code: String,
    pub name: String,
    pub description: Option<String>,
    pub upload_limit: i32,
    pub scoring_criteria: Option<String>,
    pub is_public: bool,
    pub created_at: String,
}

impl Room {
    pub fn new(owner_id: String, name: String, description: Option<String>, is_public: bool) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            owner_id,
            invite_code: generate_invite_code(),
            name,
            description,
            upload_limit: 10,
            scoring_criteria: None,
            is_public,
            created_at: Utc::now().to_rfc3339(),
        }
    }
}

fn generate_invite_code() -> String {
    use rand::Rng;
    const CHARSET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut rng = rand::thread_rng();
    (0..6)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RoomMember {
    pub room_id: String,
    pub user_id: String,
    pub role: String,
    pub joined_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateRoomRequest {
    pub name: String,
    pub description: Option<String>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRoomRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub upload_limit: Option<i32>,
    pub scoring_criteria: Option<ScoringCriteria>,
}

#[derive(Debug, Deserialize)]
pub struct JoinRoomRequest {
    pub invite_code: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScoringCriteria {
    pub criteria: Vec<Criterion>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Criterion {
    pub name: String,
    pub max_score: i32,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RoomResponse {
    pub id: String,
    pub owner_id: String,
    pub invite_code: String,
    pub name: String,
    pub description: Option<String>,
    pub upload_limit: i32,
    pub scoring_criteria: Option<ScoringCriteria>,
    pub is_public: bool,
    pub created_at: String,
    pub member_count: i32,
    pub photo_count: i32,
}

#[derive(Debug, Serialize)]
pub struct RoomMemberResponse {
    pub user_id: String,
    pub username: Option<String>,
    pub role: String,
    pub photo_count: i32,
}

