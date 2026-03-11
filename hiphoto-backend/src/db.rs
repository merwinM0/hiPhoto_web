use sqlx::SqlitePool;
use anyhow::Result;

pub async fn init_db(database_url: &str) -> Result<SqlitePool> {
    let pool = SqlitePool::connect(database_url).await?;
    
    // 创建表
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            username TEXT,
            bio TEXT,
            is_verified INTEGER DEFAULT 0,
            verification_code TEXT,
            created_at TEXT NOT NULL
        )
    "#).execute(&pool).await?;

    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL,
            invite_code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            upload_limit INTEGER DEFAULT 10,
            scoring_criteria TEXT,
            is_public INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (owner_id) REFERENCES users(id)
        )
    "#).execute(&pool).await?;

    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS room_members (
            room_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            role TEXT DEFAULT 'member',
            status TEXT DEFAULT 'pending', -- pending, approved, rejected
            joined_at TEXT,
            PRIMARY KEY (room_id, user_id),
            FOREIGN KEY (room_id) REFERENCES rooms(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    "#).execute(&pool).await?;

    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS photos (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL,
            uploader_id TEXT NOT NULL,
            image_base64 TEXT NOT NULL,
            thumbnail_base64 TEXT NOT NULL,
            width INTEGER NOT NULL,
            height INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (room_id) REFERENCES rooms(id),
            FOREIGN KEY (uploader_id) REFERENCES users(id)
        )
    "#).execute(&pool).await?;

    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            photo_id TEXT NOT NULL,
            creator_id TEXT NOT NULL,
            x REAL NOT NULL,
            y REAL NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (photo_id) REFERENCES photos(id),
            FOREIGN KEY (creator_id) REFERENCES users(id)
        )
    "#).execute(&pool).await?;

    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS scores (
            id TEXT PRIMARY KEY,
            photo_id TEXT NOT NULL,
            voter_id TEXT NOT NULL,
            criteria_type TEXT NOT NULL,
            score INTEGER NOT NULL,
            round_number INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            FOREIGN KEY (photo_id) REFERENCES photos(id),
            FOREIGN KEY (voter_id) REFERENCES users(id)
        )
    "#).execute(&pool).await?;

    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS score_rounds (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL,
            round_number INTEGER NOT NULL,
            status TEXT DEFAULT 'active',
            results TEXT,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            FOREIGN KEY (room_id) REFERENCES rooms(id)
        )
    "#).execute(&pool).await?;

    Ok(pool)
}