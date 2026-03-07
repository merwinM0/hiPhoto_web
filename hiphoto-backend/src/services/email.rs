use crate::config::Config;
use crate::error::{AppError, Result};
use lettre::{
    Message, SmtpTransport, Transport,
    message::{MultiPart, SinglePart, header::ContentType},
    transport::smtp::authentication::Credentials,
};

/// 邮件传输方式枚举
#[derive(Debug, Clone)]
pub enum EmailTransport {
    /// 使用SMTP发送邮件
    Smtp,
    /// 开发环境：打印到控制台
    Console,
    /// 测试环境：模拟发送（什么都不做）
    Mock,
}

/// 邮件服务结构体
#[derive(Debug, Clone)]
pub struct EmailService {
    config: Config,
    transport: EmailTransport,
}

impl EmailService {
    /// 创建新的邮件服务实例
    pub fn new(config: Config) -> Self {
        // 根据配置决定传输方式
        let transport = match config.email_transport.as_str() {
            "smtp" => EmailTransport::Smtp,
            "console" => EmailTransport::Console,
            "mock" => EmailTransport::Mock,
            "auto" => {
                // 自动检测：如果有有效的SMTP配置则使用SMTP，否则使用控制台
                if !config.smtp_host.is_empty() && config.smtp_host != "smtp.example.com" {
                    EmailTransport::Smtp
                } else {
                    EmailTransport::Console
                }
            }
            _ => {
                // 默认使用控制台模式
                tracing::warn!(
                    "Unknown email transport: {}, using console mode",
                    config.email_transport
                );
                EmailTransport::Console
            }
        };

        tracing::info!("Email service initialized with transport: {:?}", transport);
        Self { config, transport }
    }

    /// 创建邮件服务实例并指定传输方式（用于测试）
    // pub fn with_transport(config: Config, transport: EmailTransport) -> Self {
    //     Self { config, transport }
    // }

    /// 生成验证邮件内容（纯程序逻辑，不涉及网络）
    pub fn build_verification_email(&self, email: &str, code: &str) -> Result<Message> {
        let from_address = if !self.config.smtp_from_name.is_empty() {
            format!("{} <{}>", self.config.smtp_from_name, self.config.smtp_from)
        } else {
            self.config.smtp_from.clone()
        };
        let message = Message::builder()
            .from(
                from_address
                    .parse()
                    .map_err(|e| AppError::Email(format!("Invalid from address: {}", e)))?,
            )
            .to(email
                .parse()
                .map_err(|e| AppError::Email(format!("Invalid to address: {}", e)))?)
            // pub fn build_verification_email(&self, email: &str, code: &str) -> Result<Message> {
            //     let message = Message::builder()
            //         .from(
            //             format!("hiPhoto <{}>", self.config.smtp_from)
            //                 .parse()
            //                 .map_err(|e| AppError::Email(format!("Invalid from address: {}", e)))?,
            //         )
            //         .to(email
            //             .parse()
            //             .map_err(|e| AppError::Email(format!("Invalid to address: {}", e)))?)
            // pub fn build_verification_email(&self, email: &str, code: &str) -> Result<Message> {
            //     let message = Message::builder()
            //         .from(
            //             self.config
            //                 .smtp_from
            //                 .parse()
            //                 .map_err(|e| AppError::Email(format!("Invalid from address: {}", e)))?,
            //         )
            //         .to(email
            //             .parse()
            //             .map_err(|e| AppError::Email(format!("Invalid to address: {}", e)))?)
            .subject("HiPhoto - 邮箱验证码")
            .multipart(
                MultiPart::mixed().singlepart(
                    SinglePart::builder()
                        .header(ContentType::TEXT_HTML)
                        .body(self.build_verification_html(code)),
                ),
            )
            .map_err(|e| AppError::Email(format!("Email build failed: {}", e)))?;

        Ok(message)
    }

    /// 构建验证邮件的HTML内容
    fn build_verification_html(&self, code: &str) -> String {
        format!(
            r#"
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 30px; background-color: #f9f9f9; }}
                    .code {{ font-size: 32px; font-weight: bold; color: #4CAF50; text-align: center; 
                            margin: 20px 0; padding: 15px; background-color: white; 
                            border: 2px dashed #4CAF50; border-radius: 5px; }}
                    .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; 
                             color: #666; font-size: 12px; text-align: center; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>HiPhoto - 照片分享平台</h1>
                    </div>
                    <div class="content">
                        <h2>欢迎注册 HiPhoto</h2>
                        <p>感谢您注册 HiPhoto 账号！请使用以下验证码完成邮箱验证：</p>
                        
                        <div class="code">{}</div>
                        
                        <p><strong>验证码 10 分钟内有效</strong>，请尽快完成验证。</p>
                        <p>如果您没有注册 HiPhoto，请忽略此邮件。</p>
                    </div>
                    <div class="footer">
                        <p>此邮件由系统自动发送，请勿回复。</p>
                        <p>&copy; 2025 HiPhoto. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            "#,
            code
        )
    }

    /// 通过SMTP发送邮件（纯传输逻辑）
    async fn send_via_smtp(&self, message: &Message) -> Result<()> {
        tracing::debug!(
            "Connecting to SMTP server: {}:{}",
            self.config.smtp_host,
            self.config.smtp_port
        );

        let creds = Credentials::new(
            self.config.smtp_username.clone(),
            self.config.smtp_password.clone(),
        );

        // 根据端口和配置选择连接方式
        let mailer = if self.config.smtp_port == 465 {
            // 端口465通常使用SSL/TLS
            tracing::debug!("Using SSL/TLS for SMTP connection (port 465)");
            SmtpTransport::relay(&self.config.smtp_host)
                .map_err(|e| AppError::Email(format!("SMTP relay failed: {}", e)))?
                .port(465)
                .credentials(creds)
                .timeout(Some(std::time::Duration::from_secs(
                    self.config.smtp_timeout,
                )))
                .build()
        } else if self.config.smtp_require_tls {
            // 其他端口（如587）使用STARTTLS
            tracing::debug!("Using STARTTLS for SMTP connection");
            SmtpTransport::starttls_relay(&self.config.smtp_host)
                .map_err(|e| AppError::Email(format!("SMTP STARTTLS failed: {}", e)))?
                .credentials(creds)
                .timeout(Some(std::time::Duration::from_secs(
                    self.config.smtp_timeout,
                )))
                .build()
        } else {
            // 不使用TLS
            tracing::debug!("Using plain connection (no TLS)");
            SmtpTransport::relay(&self.config.smtp_host)
                .map_err(|e| AppError::Email(format!("SMTP relay failed: {}", e)))?
                .credentials(creds)
                .timeout(Some(std::time::Duration::from_secs(
                    self.config.smtp_timeout,
                )))
                .build()
        };

        // 添加重试机制
        let mut last_error = None;
        for attempt in 1..=self.config.smtp_max_retries {
            tracing::debug!(
                "SMTP send attempt {}/{}",
                attempt,
                self.config.smtp_max_retries
            );

            match mailer.send(message) {
                Ok(_) => {
                    tracing::info!("Email sent successfully via SMTP");
                    return Ok(());
                }
                Err(e) => {
                    last_error = Some(e);
                    if attempt < self.config.smtp_max_retries {
                        let delay = std::time::Duration::from_secs(attempt as u64 * 2);
                        tracing::warn!(
                            "SMTP send failed (attempt {}), retrying in {:?}: {}",
                            attempt,
                            delay,
                            last_error.as_ref().unwrap()
                        );
                        tokio::time::sleep(delay).await;
                    }
                }
            }
        }

        Err(AppError::Email(format!(
            "Email send failed after {} attempts: {}",
            self.config.smtp_max_retries,
            last_error.unwrap()
        )))
    }

    /// 通过控制台打印邮件（开发环境）
    fn send_via_console(&self, _message: &Message, code: &str) -> Result<()> {
        // 注意：lettre::Message没有公开的to()方法
        // 在实际使用中，我们已经在调用时知道email地址

        println!("[EMAIL CONSOLE] =========================================");
        println!("[EMAIL CONSOLE] Subject: HiPhoto - 邮箱验证码");
        println!("[EMAIL CONSOLE] Verification Code: {}", code);
        println!("[EMAIL CONSOLE] =========================================");

        Ok(())
    }

    /// 发送邮件（根据配置的传输方式）
    pub async fn send_email(&self, message: Message, code: &str) -> Result<()> {
        match self.transport {
            EmailTransport::Smtp => {
                tracing::info!("Sending verification email via SMTP");
                match self.send_via_smtp(&message).await {
                    Ok(_) => Ok(()),
                    Err(e) => {
                        // 在开发环境中，如果SMTP发送失败，回退到控制台模式
                        tracing::warn!("SMTP send failed, falling back to console mode: {}", e);
                        tracing::info!("Printing verification email to console (fallback mode)");
                        self.send_via_console(&message, code)
                    }
                }
            }
            EmailTransport::Console => {
                tracing::info!("Printing verification email to console (development mode)");
                self.send_via_console(&message, code)
            }
            EmailTransport::Mock => {
                tracing::debug!("Mock email send (test mode)");
                Ok(())
            }
        }
    }

    /// 生成并发送验证邮件（组合方法）
    pub async fn send_verification_email(&self, email: &str, code: &str) -> Result<()> {
        tracing::info!("Preparing verification email for {}", email);

        // 1. 生成邮件内容（纯程序逻辑）
        let message = self.build_verification_email(email, code)?;

        // 2. 发送邮件（传输逻辑）
        self.send_email(message, code).await?;

        tracing::info!("Verification email processed for {}", email);
        Ok(())
    }
}

/// 生成验证码（保持向后兼容）
pub fn generate_verification_code() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    (0..6).map(|_| rng.gen_range(0..10).to_string()).collect()
}

/// 向后兼容的旧接口（不推荐使用）
pub async fn send_verification_email(email: &str, code: &str, config: &Config) -> Result<()> {
    let service = EmailService::new(config.clone());
    service.send_verification_email(email, code).await
}
