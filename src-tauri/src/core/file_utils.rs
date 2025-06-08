// Syntari AI IDE - File Utilities
// Shared file operation utilities to eliminate duplication

use std::path::Path;
use crate::core::{AppResult, AppError, FileInfo};

// ================================
// FILE METADATA EXTRACTION
// ================================

/// Extract comprehensive file metadata with standardized error handling
pub fn extract_file_metadata(file_path: &Path) -> AppResult<std::fs::Metadata> {
    file_path.metadata().map_err(|e| {
        AppError::filesystem_with_path(
            "METADATA_READ_FAILED".to_string(),
            format!("Failed to read file metadata: {}", e),
            file_path.to_string_lossy().to_string()
        )
    })
}

/// Get last modified timestamp in seconds since UNIX epoch
pub fn get_last_modified_timestamp(metadata: &std::fs::Metadata) -> u64 {
    metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Create FileInfo from path with content reading
pub async fn create_file_info_with_content(file_path: &Path, read_content: bool) -> AppResult<FileInfo> {
    if !file_path.exists() {
        return Err(AppError::filesystem_with_path(
            "FILE_NOT_FOUND".to_string(),
            "File does not exist".to_string(),
            file_path.to_string_lossy().to_string()
        ));
    }

    if !file_path.is_file() {
        return Err(AppError::filesystem_with_path(
            "NOT_A_FILE".to_string(),
            "Path is not a file".to_string(),
            file_path.to_string_lossy().to_string()
        ));
    }

    let metadata = extract_file_metadata(file_path)?;
    
    let content = if read_content {
        match tokio::fs::read_to_string(file_path).await {
            Ok(content) => Some(content),
            Err(_) => None, // Non-text files or encoding issues
        }
    } else {
        None
    };

    Ok(FileInfo {
        path: file_path.to_string_lossy().to_string(),
        name: file_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "unknown".to_string()),
        extension: file_path
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_string(),
        size: metadata.len(),
        last_modified: get_last_modified_timestamp(&metadata),
        content,
        language: Some(detect_language_from_extension(file_path)),
    })
}

// ================================
// LANGUAGE DETECTION
// ================================

/// Detect programming language from file extension
pub fn detect_language_from_extension(file_path: &Path) -> String {
    match file_path.extension().and_then(|ext| ext.to_str()) {
        Some("rs") => "rust",
        Some("js") => "javascript", 
        Some("ts") => "typescript",
        Some("tsx") => "typescript",
        Some("jsx") => "javascript",
        Some("py") => "python",
        Some("java") => "java",
        Some("go") => "go",
        Some("php") => "php",
        Some("rb") => "ruby",
        Some("cs") => "csharp",
        Some("cpp") | Some("cc") | Some("cxx") => "cpp",
        Some("c") => "c",
        Some("h") | Some("hpp") => "c",
        Some("json") => "json",
        Some("toml") => "toml",
        Some("yaml") | Some("yml") => "yaml",
        Some("xml") => "xml",
        Some("html") | Some("htm") => "html",
        Some("css") => "css",
        Some("scss") | Some("sass") => "scss",
        Some("md") | Some("markdown") => "markdown",
        Some("sql") => "sql",
        Some("sh") | Some("bash") => "shell",
        Some("ps1") => "powershell",
        Some("dockerfile") => "dockerfile",
        Some("makefile") => "makefile",
        _ => {
            // Check filename patterns
            if let Some(name) = file_path.file_name().and_then(|n| n.to_str()) {
                match name.to_lowercase().as_str() {
                    "dockerfile" | "containerfile" => "dockerfile",
                    "makefile" | "gnumakefile" => "makefile",
                    "rakefile" => "ruby",
                    "gemfile" | "gemfile.lock" => "ruby",
                    "cargo.toml" | "cargo.lock" => "toml",
                    "package.json" | "package-lock.json" => "json",
                    "tsconfig.json" => "json",
                    "readme.md" | "readme" => "markdown",
                    _ => "plaintext",
                }
            } else {
                "plaintext"
            }
        }
    }.to_string()
}

/// Get file icon identifier based on language/extension
pub fn get_file_icon_id(file_path: &Path, is_directory: bool) -> String {
    if is_directory {
        return "folder".to_string();
    }
    
    let language = detect_language_from_extension(file_path);
    match language.as_str() {
        "rust" => "rust",
        "javascript" => "javascript",
        "typescript" => "typescript", 
        "python" => "python",
        "java" => "java",
        "go" => "go",
        "php" => "php",
        "ruby" => "ruby",
        "csharp" => "csharp",
        "cpp" | "c" => "cpp",
        "json" => "json",
        "toml" => "config",
        "yaml" => "yaml",
        "xml" => "xml",
        "html" => "html",
        "css" | "scss" => "css",
        "markdown" => "markdown",
        "sql" => "database",
        "shell" | "powershell" => "terminal",
        "dockerfile" => "docker",
        "makefile" => "gear",
        _ => "file",
    }.to_string()
}

// ================================
// FILE SIZE UTILITIES
// ================================

/// Format file size in human-readable format
pub fn format_file_size(size: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    let mut size = size as f64;
    let mut unit_index = 0;
    
    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }
    
    if unit_index == 0 {
        format!("{} {}", size as u64, UNITS[unit_index])
    } else {
        format!("{:.1} {}", size, UNITS[unit_index])
    }
}

/// Check if a file is safe to open in text editor
pub fn is_safe_to_open(size: u64) -> (bool, Option<String>) {
    const MAX_SAFE_SIZE: u64 = 64 * 1024 * 1024; // 64MB
    const LARGE_FILE_WARNING: u64 = 1024 * 1024; // 1MB
    
    if size > MAX_SAFE_SIZE {
        return (false, Some(format!("File too large ({}) to open safely", format_file_size(size))));
    }
    
    if size > LARGE_FILE_WARNING {
        return (true, Some(format!("Large file ({}). Some features may be slower", format_file_size(size))));
    }
    
    (true, None)
}

// ================================
// DIRECTORY UTILITIES  
// ================================

/// Check if path exists and is accessible
pub fn validate_path_access(path: &Path, operation: &str) -> AppResult<()> {
    if !path.exists() {
        return Err(AppError::filesystem_with_path(
            "PATH_NOT_FOUND".to_string(),
            format!("Path does not exist for {}", operation),
            path.to_string_lossy().to_string()
        ));
    }
    
    if !path.is_dir() {
        return Err(AppError::filesystem_with_path(
            "NOT_A_DIRECTORY".to_string(),
            "Path is not a directory".to_string(),
            path.to_string_lossy().to_string()
        ));
    }
    
    // Additional validation for files
    if operation == "file" && !path.is_file() {
        return Err(AppError::filesystem_with_path(
            "NOT_A_FILE".to_string(), 
            "Path is not a file".to_string(),
            path.to_string_lossy().to_string()
        ));
    }
    
    Ok(())
}

/// Check if directory exists and is accessible
pub fn validate_directory(path: &Path) -> AppResult<()> {
    validate_path_access(path, "directory access")?;
    
    if !path.is_dir() {
        return Err(AppError::filesystem_with_path(
            "NOT_A_DIRECTORY".to_string(),
            "Path is not a directory".to_string(),
            path.to_string_lossy().to_string()
        ));
    }
    
    Ok(())
}

/// Check if file exists and is accessible
pub fn validate_file(path: &Path) -> AppResult<()> {
    validate_path_access(path, "file access")?;
    
    if !path.is_file() {
        return Err(AppError::filesystem_with_path(
            "NOT_A_FILE".to_string(), 
            "Path is not a file".to_string(),
            path.to_string_lossy().to_string()
        ));
    }
    
    Ok(())
} 