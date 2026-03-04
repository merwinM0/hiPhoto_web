=== src/config.rs ===
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_expiration: i64,
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_username: String,
    pub smtp_password: String,
    pub smtp_from: String,
    pub frontend_url: String,
    pub max_image_width: u32,
    pub max_image_height: u32,
    pub image_quality: u8,
}

impl Config {
    pub fn from_env() -> Result<Self, dotenvy::Error> {
        dotenvy::dotenv().ok();
        
        Ok(Config {
            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "sqlite:hiphoto.db?mode=rwc".to_string()),
            jwt_secret: std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "dev-secret-key".to_string()),
            jwt_expiration: std::env::var("JWT_EXPIRATION")
                .unwrap_or_else(|_| "86400".to_string())
                .parse()
                .unwrap_or(86400),
            smtp_host: std::env::var("SMTP_HOST").unwrap_or_default(),
            smtp_port: std::env::var("SMTP_PORT")
                .unwrap_or_else(|_| "587".to_string())
                .parse()
                .unwrap_or(587),
            smtp_username: std::env::var("SMTP_USERNAME").unwrap_or_default(),
            smtp_password: std::env::var("SMTP_PASSWORD").unwrap_or_default(),
            smtp_from: std::env::var("SMTP_FROM").unwrap_or_default(),
            frontend_url: std::env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:5173".to_string()),
            max_image_width: std::env::var("MAX_IMAGE_WIDTH")
                .unwrap_or_else(|_| "1920".to_string())
                .parse()
                .unwrap_or(1920),
            max_image_height: std::env::var("MAX_IMAGE_HEIGHT")
                .unwrap_or_else(|_| "1080".to_string())
                .parse()
                .unwrap_or(1080),
            image_quality: std::env::var("IMAGE_QUALITY")
                .unwrap_or_else(|_| "70".to_string())
                .parse()
                .unwrap_or(70),
        })
    }
}


=== src/db.rs ===
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
            created_at TEXT NOT NULL,
            FOREIGN KEY (owner_id) REFERENCES users(id)
        )
    "#).execute(&pool).await?;

    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS room_members (
            room_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            role TEXT DEFAULT 'member',
            joined_at TEXT NOT NULL,
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

