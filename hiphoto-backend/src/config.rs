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
    pub smtp_from_name: String,
    pub frontend_url: String,
    pub max_image_width: u32,
    pub max_image_height: u32,
    pub image_quality: u8,
    /// 邮件传输模式：smtp, console, mock
    pub email_transport: String,
    /// SMTP连接超时（秒）
    pub smtp_timeout: u64,
    /// SMTP最大重试次数
    pub smtp_max_retries: u32,
    /// 是否启用TLS
    pub smtp_require_tls: bool,
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
            smtp_from_name: std::env::var("SMTP_FROM_NAME").unwrap_or_default(),
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
            email_transport: std::env::var("EMAIL_TRANSPORT")
                .unwrap_or_else(|_| "auto".to_string()),
            smtp_timeout: std::env::var("SMTP_TIMEOUT")
                .unwrap_or_else(|_| "30".to_string())
                .parse()
                .unwrap_or(30),
            smtp_max_retries: std::env::var("SMTP_MAX_RETRIES")
                .unwrap_or_else(|_| "3".to_string())
                .parse()
                .unwrap_or(3),
            smtp_require_tls: std::env::var("SMTP_REQUIRE_TLS")
                .unwrap_or_else(|_| "true".to_string())
                .parse()
                .unwrap_or(true),
        })
    }
}
