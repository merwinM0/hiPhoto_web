use axum::{
    extract::{Path, State},
    Extension,
    Json,
};
use sqlx::SqlitePool;
use crate::config::Config;
use std::collections::HashMap;

use crate::error::{AppError, Result};
use crate::services::auth::AuthUser;
use crate::models::{
    Score, ScoreResponse, SubmitScoreRequest, ScoreRound, ScoreRoundResponse,
    ScoreBoardEntry, Photo,
};

pub async fn submit_score(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Json(payload): Json<SubmitScoreRequest>,
) -> Result<Json<ScoreResponse>> {
    // 获取图片信息
    let photo = sqlx::query_as::<_, Photo>(
        "SELECT * FROM photos WHERE id = ?"
    )
    .bind(&payload.photo_id)
    .fetch_one(&pool)
    .await?;

    // 验证成员身份
    let is_member: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM room_members WHERE room_id = ? AND user_id = ? AND status = 'approved'"
    )
    .bind(&photo.room_id)
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    if !is_member {
        return Err(AppError::Auth("Not an approved member of this room".to_string()));
    }

    // 获取当前评分轮次
    let round = sqlx::query_as::<_, ScoreRound>(
        "SELECT * FROM score_rounds WHERE room_id = ? AND status = 'active' ORDER BY round_number DESC LIMIT 1"
    )
    .bind(&photo.room_id)
    .fetch_optional(&pool)
    .await?;

    let round_number = match round {
        Some(r) => r.round_number,
        None => {
            // 创建新轮次
            let round_number: i32 = sqlx::query_scalar(
                "SELECT COALESCE(MAX(round_number), 0) + 1 FROM score_rounds WHERE room_id = ?"
            )
            .bind(&photo.room_id)
            .fetch_one(&pool)
            .await?;

            let round_id = uuid::Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO score_rounds (id, room_id, round_number, status, started_at) VALUES (?, ?, ?, 'active', datetime('now'))"
            )
            .bind(&round_id)
            .bind(&photo.room_id)
            .bind(round_number)
            .execute(&pool)
            .await?;

            round_number
        }
    };

    // 检查是否已评分
    let existing: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM scores WHERE photo_id = ? AND voter_id = ? AND criteria_type = ? AND round_number = ?"
    )
    .bind(&payload.photo_id)
    .bind(&auth_user.user_id)
    .bind(&payload.criteria_type)
    .bind(round_number)
    .fetch_one(&pool)
    .await?;

    if existing {
        // 更新评分
        sqlx::query(
            "UPDATE scores SET score = ? WHERE photo_id = ? AND voter_id = ? AND criteria_type = ? AND round_number = ?"
        )
        .bind(payload.score)
        .bind(&payload.photo_id)
        .bind(&auth_user.user_id)
        .bind(&payload.criteria_type)
        .bind(round_number)
        .execute(&pool)
        .await?;
    } else {
        // 创建评分
        let score = Score::new(
            payload.photo_id.clone(),
            auth_user.user_id.clone(),
            payload.criteria_type.clone(),
            payload.score,
            round_number,
        );

        sqlx::query(
            "INSERT INTO scores (id, photo_id, voter_id, criteria_type, score, round_number, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&score.id)
        .bind(&score.photo_id)
        .bind(&score.voter_id)
        .bind(&score.criteria_type)
        .bind(score.score)
        .bind(score.round_number)
        .bind(&score.created_at)
        .execute(&pool)
        .await?;
    }

    let voter_name: Option<String> = sqlx::query_scalar(
        "SELECT username FROM users WHERE id = ?"
    )
    .bind(&auth_user.user_id)
    .fetch_optional(&pool)
    .await?
    .flatten();

    Ok(Json(ScoreResponse {
        id: "".to_string(),
        photo_id: payload.photo_id,
        voter_id: auth_user.user_id,
        voter_name,
        criteria_type: payload.criteria_type,
        score: payload.score,
        round_number,
        created_at: chrono::Utc::now().to_rfc3339(),
    }))
}

pub async fn get_scoreboard(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Path(room_id): Path<String>,
) -> Result<Json<ScoreRoundResponse>> {
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

    // 获取当前活跃轮次
    let round = sqlx::query_as::<_, ScoreRound>(
        "SELECT * FROM score_rounds WHERE room_id = ? AND status = 'active' ORDER BY round_number DESC LIMIT 1"
    )
    .bind(&room_id)
    .fetch_optional(&pool)
    .await?;

    let round_number = match &round {
        Some(r) => r.round_number,
        None => 1,
    };

    // 获取所有图片
    let photos = sqlx::query_as::<_, Photo>(
        "SELECT * FROM photos WHERE room_id = ?"
    )
    .bind(&room_id)
    .fetch_all(&pool)
    .await?;

    let mut scoreboard = Vec::new();

    for photo in photos {
        let uploader_name: Option<String> = sqlx::query_scalar(
            "SELECT username FROM users WHERE id = ?"
        )
        .bind(&photo.uploader_id)
        .fetch_optional(&pool)
        .await?
        .flatten();

        // 获取该图片各类型的平均分
        let scores: Vec<(String, i32)> = sqlx::query_as(
            "SELECT criteria_type, score FROM scores WHERE photo_id = ? AND round_number = ?"
        )
        .bind(&photo.id)
        .bind(round_number)
        .fetch_all(&pool)
        .await?;

        let mut criteria_scores: HashMap<String, f64> = HashMap::new();
        let mut criteria_counts: HashMap<String, i32> = HashMap::new();

        for (criteria_type, score) in scores {
            *criteria_scores.entry(criteria_type.clone()).or_insert(0.0) += score as f64;
            *criteria_counts.entry(criteria_type).or_insert(0) += 1;
        }

        // 计算平均分
        for (criteria, total) in criteria_scores.iter_mut() {
            if let Some(&count) = criteria_counts.get(criteria) {
                *total /= count as f64;
            }
        }

        let total_score: f64 = criteria_scores.values().sum();

        scoreboard.push(ScoreBoardEntry {
            photo_id: photo.id,
            uploader_name,
            total_score,
            criteria_scores,
        });
    }

    // 按总分排序
    scoreboard.sort_by(|a, b| b.total_score.partial_cmp(&a.total_score).unwrap());

    Ok(Json(ScoreRoundResponse {
        round_number,
        status: round.map(|r| r.status).unwrap_or_else(|| "active".to_string()),
        scoreboard,
    }))
}

pub async fn end_round(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Path(room_id): Path<String>,
) -> Result<Json<serde_json::Value>> {
    // 验证房主身份
    let is_owner: bool = sqlx::query_scalar(
        "SELECT owner_id = ? FROM rooms WHERE id = ?"
    )
    .bind(&auth_user.user_id)
    .bind(&room_id)
    .fetch_one(&pool)
    .await?;

    if !is_owner {
        return Err(AppError::Auth("Only room owner can end round".to_string()));
    }

    // 结束当前轮次
    sqlx::query(
        "UPDATE score_rounds SET status = 'completed', ended_at = datetime('now') WHERE room_id = ? AND status = 'active'"
    )
    .bind(&room_id)
    .execute(&pool)
    .await?;

    Ok(Json(serde_json::json!({
        "message": "Round ended successfully"
    })))
}

pub async fn start_new_round(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Path(room_id): Path<String>,
) -> Result<Json<serde_json::Value>> {
    // 验证房主身份
    let is_owner: bool = sqlx::query_scalar(
        "SELECT owner_id = ? FROM rooms WHERE id = ?"
    )
    .bind(&auth_user.user_id)
    .bind(&room_id)
    .fetch_one(&pool)
    .await?;

    if !is_owner {
        return Err(AppError::Auth("Only room owner can start new round".to_string()));
    }

    // 结束当前活跃轮次（如果有）
    sqlx::query(
        "UPDATE score_rounds SET status = 'completed', ended_at = datetime('now') WHERE room_id = ? AND status = 'active'"
    )
    .bind(&room_id)
    .execute(&pool)
    .await?;

    // 创建新轮次
    let round_number: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(round_number), 0) + 1 FROM score_rounds WHERE room_id = ?"
    )
    .bind(&room_id)
    .fetch_one(&pool)
    .await?;

    let round_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO score_rounds (id, room_id, round_number, status, started_at) VALUES (?, ?, ?, 'active', datetime('now'))"
    )
    .bind(&round_id)
    .bind(&room_id)
    .bind(round_number)
    .execute(&pool)
    .await?;

    Ok(Json(serde_json::json!({
        "message": "New round started",
        "round_number": round_number
    })))
}
