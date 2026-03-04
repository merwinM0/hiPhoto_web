use crate::error::{AppError, Result};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use image::{imageops::FilterType, DynamicImage, ImageBuffer, GenericImageView};

pub struct ProcessedImage {
    pub image_base64: String,
    pub thumbnail_base64: String,
    pub width: u32,
    pub height: u32,
}

pub fn process_image(
    base64_data: &str,
    max_width: u32,
    max_height: u32,
    quality: u8,
) -> Result<ProcessedImage> {
    // 移除 data:image/xxx;base64, 前缀
    let base64_data = if let Some(idx) = base64_data.find(",") {
        &base64_data[idx + 1..]
    } else {
        base64_data
    };

    // 解码 Base64
    let image_bytes = STANDARD
        .decode(base64_data)
        .map_err(|e| AppError::Image(format!("Base64 decode failed: {}", e)))?;

    // 解析图片
    let img = image::load_from_memory(&image_bytes)
        .map_err(|e| AppError::Image(format!("Image load failed: {}", e)))?;

    // 计算缩放尺寸
    let (width, height) = img.dimensions();
    let scale = if width > max_width || height > max_height {
        let scale_w = max_width as f64 / width as f64;
        let scale_h = max_height as f64 / height as f64;
        scale_w.min(scale_h)
    } else {
        1.0
    };

    let new_width = (width as f64 * scale) as u32;
    let new_height = (height as f64 * scale) as u32;

    // 缩放图片
    let resized = img.resize(new_width, new_height, FilterType::Lanczos3);

    // 生成缩略图 (256px)
    let thumb_size = 256;
    let thumb = resized.thumbnail(thumb_size, thumb_size);

    // 编码为 JPEG
    let mut main_buffer = Vec::new();
    resized
        .write_to(&mut std::io::Cursor::new(&mut main_buffer), image::ImageFormat::Jpeg)
        .map_err(|e| AppError::Image(format!("Image encode failed: {}", e)))?;

    let mut thumb_buffer = Vec::new();
    thumb
        .write_to(&mut std::io::Cursor::new(&mut thumb_buffer), image::ImageFormat::Jpeg)
        .map_err(|e| AppError::Image(format!("Thumbnail encode failed: {}", e)))?;

    Ok(ProcessedImage {
        image_base64: STANDARD.encode(&main_buffer),
        thumbnail_base64: STANDARD.encode(&thumb_buffer),
        width: new_width,
        height: new_height,
    })
}
