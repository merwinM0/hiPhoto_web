use lettre::{
    message::{header::ContentType, MultiPart, SinglePart},
    transport::smtp::authentication::Credentials,
    Message, SmtpTransport, Transport,
};
use crate::error::{Result, AppError};
use crate::config::Config;

pub async fn send_verification_email(
    email: &str,
    code: &str,
    config: &Config,
) -> Result<()> {
    let email_builder = Message::builder()
        .from(config.smtp_from.parse().map_err(|e| AppError::Email(format!("Invalid from address: {}", e)))?)
        .to(email.parse().map_err(|e| AppError::Email(format!("Invalid to address: {}", e)))?)
        .subject("HiPhoto - 邮箱验证码")
        .multipart(
            MultiPart::mixed().singlepart(
                SinglePart::builder()
                    .header(ContentType::TEXT_HTML)
                    .body(format!(
                        r#"
                        <html>
                        <body>
                            <h2>欢迎注册 HiPhoto</h2>
                            <p>您的验证码是：<strong style="font-size: 24px;">{}</strong></p>
                            <p>验证码 10 分钟内有效</p>
                        </body>
                        </html>
                        "#,
                        code
                    )),
            ),
        )
        .map_err(|e| AppError::Email(format!("Email build failed: {}", e)))?;

    let creds = Credentials::new(
        config.smtp_username.clone(),
        config.smtp_password.clone(),
    );

    let mailer = SmtpTransport::starttls_relay(&config.smtp_host)
        .map_err(|e| AppError::Email(format!("SMTP connection failed: {}", e)))?
        .credentials(creds)
        .port(config.smtp_port)
        .build();

    mailer
        .send(&email_builder)
        .map_err(|e| AppError::Email(format!("Email send failed: {}", e)))?;

    Ok(())
}

pub fn generate_verification_code() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    (0..6)
        .map(|_| rng.gen_range(0..10).to_string())
        .collect()
}
