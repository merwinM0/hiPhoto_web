use axum::{
    extract::{Path, State},
    Extension,
    Json,
};
use sqlx::SqlitePool;
use serde_json::json;

use crate::config::Config;
use crate::error::{AppError, Result};
use crate::services::auth::AuthUser;
use crate::models::{
    CreateRoomRequest, UpdateRoomRequest, JoinRoomRequest, JoinPublicRoomRequest,
    Room, RoomMember, RoomResponse, RoomMemberResponse, ScoringCriteria,
    JoinRequest, PendingRequestCount,
};

pub async fn create_room(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Json(payload): Json<CreateRoomRequest>,
) -> Result<Json<RoomResponse>> {
    let is_public = payload.is_public.unwrap_or(false);
    let room = Room::new(auth_user.user_id.clone(), payload.name, payload.description, is_public);

    // 创建房间
    sqlx::query(
        "INSERT INTO rooms (id, owner_id, invite_code, name, description, upload_limit, scoring_criteria, is_public, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&room.id)
    .bind(&room.owner_id)
    .bind(&room.invite_code)
    .bind(&room.name)
    .bind(&room.description)
    .bind(room.upload_limit)
    .bind(&room.scoring_criteria)
    .bind(room.is_public)
    .bind(&room.created_at)
    .execute(&pool)
    .await?;

    // 房主自动成为成员（已批准）
    sqlx::query(
        "INSERT INTO room_members (room_id, user_id, role, status, joined_at) VALUES (?, ?, 'owner', 'approved', datetime('now'))"
    )
    .bind(&room.id)
    .bind(&auth_user.user_id)
    .execute(&pool)
    .await?;

    Ok(Json(RoomResponse {
        id: room.id,
        owner_id: room.owner_id,
        invite_code: room.invite_code,
        name: room.name,
        description: room.description,
        upload_limit: room.upload_limit,
        scoring_criteria: None,
        is_public: room.is_public,
        created_at: room.created_at,
        member_count: 1,
        photo_count: 0,
    }))
}

pub async fn get_rooms(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<Vec<RoomResponse>>> {
    let rooms = sqlx::query_as::<_, Room>(
        "SELECT r.* FROM rooms r
         INNER JOIN room_members rm ON r.id = rm.room_id
         WHERE rm.user_id = ?"
    )
    .bind(&auth_user.user_id)
    .fetch_all(&pool)
    .await?;

    let mut responses = Vec::new();
    for room in rooms {
        let member_count: i32 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM room_members WHERE room_id = ?"
        )
        .bind(&room.id)
        .fetch_one(&pool)
        .await?;

        let photo_count: i32 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM photos WHERE room_id = ?"
        )
        .bind(&room.id)
        .fetch_one(&pool)
        .await?;

        let scoring_criteria: Option<ScoringCriteria> = room.scoring_criteria
            .as_ref()
            .and_then(|s| serde_json::from_str(s).ok());

        responses.push(RoomResponse {
            id: room.id,
            owner_id: room.owner_id,
            invite_code: room.invite_code,
            name: room.name,
            description: room.description,
            upload_limit: room.upload_limit,
            scoring_criteria,
            is_public: room.is_public,
            created_at: room.created_at,
            member_count,
            photo_count,
        });
    }

    Ok(Json(responses))
}

pub async fn get_room(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Path(room_id): Path<String>,
) -> Result<Json<RoomResponse>> {
    // 首先检查是否是房主
    let is_owner: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM rooms WHERE id = ? AND owner_id = ?"
    )
    .bind(&room_id)
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    // 如果不是房主，检查是否是已批准的成员
    if !is_owner {
        let is_approved_member: bool = sqlx::query_scalar(
            "SELECT COUNT(*) > 0 FROM room_members WHERE room_id = ? AND user_id = ? AND status = 'approved'"
        )
        .bind(&room_id)
        .bind(&auth_user.user_id)
        .fetch_one(&pool)
        .await?;

        if !is_approved_member {
            return Err(AppError::Auth("Not an approved member of this room".to_string()));
        }
    }

    let room = sqlx::query_as::<_, Room>(
        "SELECT * FROM rooms WHERE id = ?"
    )
    .bind(&room_id)
    .fetch_one(&pool)
    .await?;

    let member_count: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM room_members WHERE room_id = ?"
    )
    .bind(&room_id)
    .fetch_one(&pool)
    .await?;

    let photo_count: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM photos WHERE room_id = ?"
    )
    .bind(&room_id)
    .fetch_one(&pool)
    .await?;

    let scoring_criteria: Option<ScoringCriteria> = room.scoring_criteria
        .as_ref()
        .and_then(|s| serde_json::from_str(s).ok());

    Ok(Json(RoomResponse {
        id: room.id,
        owner_id: room.owner_id,
        invite_code: room.invite_code,
        name: room.name,
        description: room.description,
        upload_limit: room.upload_limit,
        scoring_criteria,
        is_public: room.is_public,
        created_at: room.created_at,
        member_count,
        photo_count,
    }))
}

pub async fn update_room(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Path(room_id): Path<String>,
    Json(payload): Json<UpdateRoomRequest>,
) -> Result<Json<RoomResponse>> {
    // 验证是否是房主
    let room = sqlx::query_as::<_, Room>(
        "SELECT * FROM rooms WHERE id = ?"
    )
    .bind(&room_id)
    .fetch_one(&pool)
    .await?;

    if room.owner_id != auth_user.user_id {
        return Err(AppError::Auth("Only room owner can update room".to_string()));
    }

    let name = payload.name.unwrap_or(room.name);
    let description = payload.description.or(room.description);
    let upload_limit = payload.upload_limit.unwrap_or(room.upload_limit);
    let scoring_criteria = payload.scoring_criteria
        .map(|c| serde_json::to_string(&c).unwrap())
        .or(room.scoring_criteria);

    sqlx::query(
        "UPDATE rooms SET name = ?, description = ?, upload_limit = ?, scoring_criteria = ? WHERE id = ?"
    )
    .bind(&name)
    .bind(&description)
    .bind(upload_limit)
    .bind(&scoring_criteria)
    .bind(&room_id)
    .execute(&pool)
    .await?;

    get_room(State((pool, _config)), Extension(auth_user), Path(room_id)).await
}

pub async fn join_public_room(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Json(payload): Json<JoinPublicRoomRequest>,
) -> Result<Json<serde_json::Value>> {
    let room_id = payload.room_id;

    // 检查房间是否存在且是公开的
    let room: Option<(bool,)> = sqlx::query_as(
        "SELECT is_public FROM rooms WHERE id = ?"
    )
    .bind(&room_id)
    .fetch_optional(&pool)
    .await?;

    let (is_public,) = room.ok_or_else(|| AppError::NotFound("Room not found".to_string()))?;

    if !is_public {
        return Err(AppError::Validation("Room is not public".to_string()));
    }

    // 检查是否已是成员
    let member_status: Option<String> = sqlx::query_scalar(
        "SELECT status FROM room_members WHERE room_id = ? AND user_id = ?"
    )
    .bind(&room_id)
    .bind(&auth_user.user_id)
    .fetch_optional(&pool)
    .await?;

    if let Some(status) = member_status {
        match status.as_str() {
            "approved" => return Err(AppError::Validation("Already a member of this room".to_string())),
            "pending" => return Err(AppError::Validation("Waiting for approval".to_string())),
            "rejected" => {
                // 如果之前被拒绝，可以重新申请
                sqlx::query(
                    "UPDATE room_members SET status = 'pending' WHERE room_id = ? AND user_id = ?"
                )
                .bind(&room_id)
                .bind(&auth_user.user_id)
                .execute(&pool)
                .await?;
                
                return Ok(Json(serde_json::json!({
                    "message": "Application submitted, waiting for approval",
                    "room_id": room_id
                })));
            }
            _ => {}
        }
    }

    // 申请加入公开房间：需要审批
    sqlx::query(
        "INSERT INTO room_members (room_id, user_id, role, status) VALUES (?, ?, 'member', 'pending')"
    )
    .bind(&room_id)
    .bind(&auth_user.user_id)
    .execute(&pool)
    .await?;

    Ok(Json(serde_json::json!({
        "message": "Application submitted, waiting for approval",
        "room_id": room_id
    })))
}

pub async fn join_room(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Json(payload): Json<JoinRoomRequest>,
) -> Result<Json<RoomResponse>> {
    let room = sqlx::query_as::<_, Room>(
        "SELECT * FROM rooms WHERE invite_code = ?"
    )
    .bind(&payload.invite_code)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Invalid invite code".to_string()))?;

    // 检查是否已是成员
    let member_status: Option<String> = sqlx::query_scalar(
        "SELECT status FROM room_members WHERE room_id = ? AND user_id = ?"
    )
    .bind(&room.id)
    .bind(&auth_user.user_id)
    .fetch_optional(&pool)
    .await?;

    if let Some(status) = member_status {
        match status.as_str() {
            "approved" => return Err(AppError::Validation("Already a member of this room".to_string())),
            "pending" => return Err(AppError::Validation("Waiting for approval".to_string())),
            "rejected" => {
                // 如果之前被拒绝，可以重新申请
                sqlx::query(
                    "UPDATE room_members SET status = 'pending' WHERE room_id = ? AND user_id = ?"
                )
                .bind(&room.id)
                .bind(&auth_user.user_id)
                .execute(&pool)
                .await?;
                
                return get_room(State((pool, _config)), Extension(auth_user), Path(room.id)).await;
            }
            _ => {}
        }
    }

    // 通过邀请码加入：直接批准
    let status = "approved";
    let joined_at = Some(chrono::Utc::now().to_rfc3339());

    // 加入房间
    sqlx::query(
        "INSERT INTO room_members (room_id, user_id, role, status, joined_at) VALUES (?, ?, 'member', ?, ?)"
    )
    .bind(&room.id)
    .bind(&auth_user.user_id)
    .bind(status)
    .bind(&joined_at)
    .execute(&pool)
    .await?;

    get_room(State((pool, _config)), Extension(auth_user), Path(room.id)).await
}

pub async fn get_room_members(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Path(room_id): Path<String>,
) -> Result<Json<Vec<RoomMemberResponse>>> {
    // 首先检查是否是房主
    let is_owner: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM rooms WHERE id = ? AND owner_id = ?"
    )
    .bind(&room_id)
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    // 如果不是房主，检查是否是已批准的成员
    if !is_owner {
        let is_approved_member: bool = sqlx::query_scalar(
            "SELECT COUNT(*) > 0 FROM room_members WHERE room_id = ? AND user_id = ? AND status = 'approved'"
        )
        .bind(&room_id)
        .bind(&auth_user.user_id)
        .fetch_one(&pool)
        .await?;

        if !is_approved_member {
            return Err(AppError::Auth("Not an approved member of this room".to_string()));
        }
    }

    let members = sqlx::query_as::<_, RoomMember>(
        "SELECT * FROM room_members WHERE room_id = ?"
    )
    .bind(&room_id)
    .fetch_all(&pool)
    .await?;

    let mut responses = Vec::new();
    for member in members {
        let username: Option<String> = sqlx::query_scalar(
            "SELECT username FROM users WHERE id = ?"
        )
        .bind(&member.user_id)
        .fetch_optional(&pool)
        .await?
        .flatten();

        let photo_count: i32 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM photos WHERE room_id = ? AND uploader_id = ?"
        )
        .bind(&room_id)
        .bind(&member.user_id)
        .fetch_one(&pool)
        .await?;

        responses.push(RoomMemberResponse {
            user_id: member.user_id,
            username,
            role: member.role,
            status: member.status,
            photo_count,
        });
    }

    Ok(Json(responses))
}

pub async fn approve_member(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Path((room_id, user_id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>> {
    // 验证房主身份
    let is_owner: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM rooms WHERE id = ? AND owner_id = ?"
    )
    .bind(&room_id)
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    if !is_owner {
        return Err(AppError::Auth("Only room owner can approve members".to_string()));
    }

    // 批准成员
    sqlx::query(
        "UPDATE room_members SET status = 'approved', joined_at = datetime('now') WHERE room_id = ? AND user_id = ?"
    )
    .bind(&room_id)
    .bind(&user_id)
    .execute(&pool)
    .await?;

    Ok(Json(serde_json::json!({
        "message": "Member approved successfully"
    })))
}

pub async fn reject_member(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Path((room_id, user_id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>> {
    // 验证房主身份
    let is_owner: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM rooms WHERE id = ? AND owner_id = ?"
    )
    .bind(&room_id)
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    if !is_owner {
        return Err(AppError::Auth("Only room owner can reject members".to_string()));
    }

    // 拒绝成员
    sqlx::query(
        "UPDATE room_members SET status = 'rejected' WHERE room_id = ? AND user_id = ?"
    )
    .bind(&room_id)
    .bind(&user_id)
    .execute(&pool)
    .await?;

    Ok(Json(serde_json::json!({
        "message": "Member rejected"
    })))
}

pub async fn kick_member(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Path((room_id, user_id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>> {
    // 验证房主身份
    let is_owner: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM rooms WHERE id = ? AND owner_id = ?"
    )
    .bind(&room_id)
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    if !is_owner {
        return Err(AppError::Auth("Only room owner can kick members".to_string()));
    }

    // 不能踢出自己
    if user_id == auth_user.user_id {
        return Err(AppError::Validation("Cannot kick yourself".to_string()));
    }

    // 删除成员
    sqlx::query(
        "DELETE FROM room_members WHERE room_id = ? AND user_id = ?"
    )
    .bind(&room_id)
    .bind(&user_id)
    .execute(&pool)
    .await?;

    Ok(Json(serde_json::json!({
        "message": "Member kicked successfully"
    })))
}

pub async fn leave_room(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
    Path(room_id): Path<String>,
) -> Result<Json<serde_json::Value>> {
    let room = sqlx::query_as::<_, Room>(
        "SELECT * FROM rooms WHERE id = ?"
    )
    .bind(&room_id)
    .fetch_one(&pool)
    .await?;

    if room.owner_id == auth_user.user_id {
        return Err(AppError::Validation("Room owner cannot leave. Transfer ownership or delete room instead.".to_string()));
    }

    sqlx::query(
        "DELETE FROM room_members WHERE room_id = ? AND user_id = ?"
    )
    .bind(&room_id)
    .bind(&auth_user.user_id)
    .execute(&pool)
    .await?;

    Ok(Json(json!({
        "message": "Left room successfully"
    })))
}

pub async fn get_public_rooms(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<Vec<RoomResponse>>> {
    let rooms = sqlx::query_as::<_, Room>(
        "SELECT r.* FROM rooms r WHERE r.is_public = 1"
    )
    .fetch_all(&pool)
    .await?;

    let mut responses = Vec::new();
    for room in rooms {
        let member_status: Option<String> = sqlx::query_scalar(
            "SELECT status FROM room_members WHERE room_id = ? AND user_id = ?"
        )
        .bind(&room.id)
        .bind(&auth_user.user_id)
        .fetch_optional(&pool)
        .await?;

        if let Some(status) = member_status {
            if status == "approved" || status == "pending" {
                continue;
            }
        }

        let member_count: i32 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM room_members WHERE room_id = ? AND status = 'approved'"
        )
        .bind(&room.id)
        .fetch_one(&pool)
        .await?;

        let photo_count: i32 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM photos WHERE room_id = ?"
        )
        .bind(&room.id)
        .fetch_one(&pool)
        .await?;

        let scoring_criteria: Option<ScoringCriteria> = room.scoring_criteria
            .as_ref()
            .and_then(|s| serde_json::from_str(s).ok());

        responses.push(RoomResponse {
            id: room.id,
            owner_id: room.owner_id,
            invite_code: room.invite_code,
            name: room.name,
            description: room.description,
            upload_limit: room.upload_limit,
            scoring_criteria,
            is_public: room.is_public,
            created_at: room.created_at,
            member_count,
            photo_count,
        });
    }

    Ok(Json(responses))
}

pub async fn get_pending_requests(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<Vec<JoinRequest>>> {
    let requests = sqlx::query_as::<_, (String, String, String, Option<String>, String, Option<String>)>(
        r#"SELECT rm.room_id, r.name, rm.user_id, u.username, rm.status, rm.joined_at
           FROM room_members rm
           INNER JOIN rooms r ON rm.room_id = r.id
           INNER JOIN users u ON rm.user_id = u.id
           WHERE r.owner_id = ? AND rm.status = 'pending'"#
    )
    .bind(&auth_user.user_id)
    .fetch_all(&pool)
    .await?;

    let join_requests: Vec<JoinRequest> = requests
        .into_iter()
        .map(|(room_id, room_name, user_id, username, status, created_at)| JoinRequest {
            room_id,
            room_name,
            user_id,
            username,
            status,
            created_at,
        })
        .collect();

    Ok(Json(join_requests))
}

pub async fn get_pending_request_count(
    State((pool, _config)): State<(SqlitePool, Config)>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<PendingRequestCount>> {
    let count: i32 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM room_members rm
           INNER JOIN rooms r ON rm.room_id = r.id
           WHERE r.owner_id = ? AND rm.status = 'pending'"#
    )
    .bind(&auth_user.user_id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(PendingRequestCount { count }))
}
