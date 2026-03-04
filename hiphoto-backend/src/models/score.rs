use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Score {
    pub id: String,
    pub photo_id: String,
    pub voter_id: String,
    pub criteria_type: String,
    pub score: i32,
    pub round_number: i32,
    pub created_at: String,
}

impl Score {
    pub fn new(
        photo_id: String,
        voter_id: String,
        criteria_type: String,
        score: i32,
        round_number: i32,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            photo_id,
            voter_id,
            criteria_type,
            score,
            round_number,
            created_at: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct SubmitScoreRequest {
    pub photo_id: String,
    pub criteria_type: String,
    pub score: i32,
}

#[derive(Debug, Serialize)]
pub struct ScoreResponse {
    pub id: String,
    pub photo_id: String,
    pub voter_id: String,
    pub voter_name: Option<String>,
    pub criteria_type: String,
    pub score: i32,
    pub round_number: i32,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ScoreRound {
    pub id: String,
    pub room_id: String,
    pub round_number: i32,
    pub status: String,
    pub results: Option<String>,
    pub started_at: String,
    pub ended_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ScoreBoardEntry {
    pub photo_id: String,
    pub uploader_name: Option<String>,
    pub total_score: f64,
    pub criteria_scores: HashMap<String, f64>,
}

#[derive(Debug, Serialize)]
pub struct ScoreRoundResponse {
    pub round_number: i32,
    pub status: String,
    pub scoreboard: Vec<ScoreBoardEntry>,
}
