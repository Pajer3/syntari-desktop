// Syntari AI IDE - File Operations Commands
// Basic file I/O operations with VS Code-style safety guards

use std::path::{Path, PathBuf};
// Removed unused imports - std::fs and GitignoreBuilder
use crate::core::TauriResult;
use tauri::Emitter;

// VS Code file size limits
const MAX_EDITOR_FILE_SIZE: u64 = 64 * 1024 * 1024; // 64MB - refuse to tokenize
const MAX_SAFE_FILE_SIZE: u64 = 256 * 1024 * 1024;  // 256MB - hex mode only
const LARGE_FILE_WARNING: u64 = 1024 * 1024;        // 1MB - show warning

/// Security: Validate and sanitize file paths to prevent traversal attacks
fn validate_path_security(path: &str) -> Result<PathBuf, String> {
    let path = Path::new(path);
    
    // Reject obvious path traversal attempts
    if path.to_string_lossy().contains("..") {
        return Err("Path traversal not allowed: contains '..'".to_string());
    }
    
    // Canonicalize the path to resolve any remaining traversal attempts
    let canonical_path = match path.canonicalize() {
        Ok(p) => p,
        Err(_) => {
            // If canonicalize fails, it might be because file doesn't exist yet
            // Try canonicalizing the parent directory and append the filename
            match path.parent() {
                Some(parent) => {
                    match parent.canonicalize() {
                        Ok(canonical_parent) => {
                            if let Some(filename) = path.file_name() {
                                canonical_parent.join(filename)
                            } else {
                                return Err("Invalid file path".to_string());
                            }
                        }
                        Err(_) => return Err("Parent directory is not accessible".to_string()),
                    }
                }
                None => return Err("Invalid file path: no parent directory".to_string()),
            }
        }
    };
    
    // Additional security: Ensure path is within reasonable bounds
    // (This could be enhanced to check against project root/allowed directories)
    let path_str = canonical_path.to_string_lossy();
    
    // Block access to sensitive system directories
    if path_str.contains("/etc/") || 
       path_str.contains("/proc/") || 
       path_str.contains("/sys/") ||
       path_str.contains("C:\\Windows\\") ||
       path_str.contains("C:\\System32\\") {
        return Err("Access to system directories is not allowed".to_string());
    }
    
    Ok(canonical_path)
}

#[derive(serde::Serialize)]
pub struct FileReadResult {
    content: Option<String>,
    size: u64,
    is_binary: bool,
    is_too_large: bool,
    should_use_hex_mode: bool,
    warning: Option<String>,
}

/// VS Code-style smart file reading with size guards
// MOVED TO CORE: Duplicate command moved to core/commands.rs
// #[tauri::command]
pub async fn read_file_smart_impl(path: String) -> std::result::Result<TauriResult<FileReadResult>, String> {
    // Security: Validate path first
    let secure_path = match validate_path_security(&path) {
        Ok(p) => p,
        Err(e) => return Ok(TauriResult::error(format!("Security validation failed: {}", e))),
    };
    
    let path = secure_path.as_path();
    
    // Get file metadata first (don't read content yet)
    let metadata = match std::fs::metadata(&path) {
        Ok(m) => m,
        Err(e) => return Ok(TauriResult::error(format!("Failed to read file metadata: {}", e))),
    };
    
    let size = metadata.len();
    
    // VS Code-style size checks
    if size > MAX_SAFE_FILE_SIZE {
        let result = FileReadResult {
            content: None,
            size,
            is_binary: false,
            is_too_large: true,
            should_use_hex_mode: false,
            warning: Some(format!("File too large ({:.1} MB). Maximum supported size is 256 MB.", size as f64 / 1024.0 / 1024.0)),
        };
        return Ok(TauriResult::success(result));
    }
    
    if size > MAX_EDITOR_FILE_SIZE {
        let result = FileReadResult {
            content: None,
            size,
            is_binary: false,
            is_too_large: false,
            should_use_hex_mode: true,
            warning: Some(format!("Large file ({:.1} MB). Opening in read-only hex mode for performance.", size as f64 / 1024.0 / 1024.0)),
        };
        return Ok(TauriResult::success(result));
    }
    
    // Read content for smaller files
    let content = match std::fs::read(&path) {
        Ok(c) => c,
        Err(e) => return Ok(TauriResult::error(format!("Failed to read file: {}", e))),
    };
    
    // Check if binary (VS Code approach)
    let is_binary = content.iter().take(8192).any(|&b| b == 0);
    
    let file_content = if is_binary {
        None // Don't try to convert binary to string
    } else {
        match String::from_utf8(content) {
            Ok(text) => Some(text),
            Err(_) => {
                // Try with UTF-8 lossy conversion
                match std::fs::read(&path) {
                    Ok(bytes) => Some(String::from_utf8_lossy(&bytes).to_string()),
                    Err(_) => None,
                }
            }
        }
    };
    
    let warning = if size > LARGE_FILE_WARNING {
        Some(format!("Large file ({:.1} MB). Some features may be slower.", size as f64 / 1024.0 / 1024.0))
    } else {
        None
    };
    
    let result = FileReadResult {
        content: file_content,
        size,
        is_binary,
        is_too_large: false,
        should_use_hex_mode: false,
        warning,
    };
    
    Ok(TauriResult::success(result))
}

/// Original simple file read for compatibility
#[tauri::command]
pub async fn read_file(path: String) -> std::result::Result<TauriResult<String>, String> {
    let smart_result = read_file_smart_impl(path).await?;
    
    match smart_result.data {
        Some(file_data) => {
            if file_data.is_too_large {
                Ok(TauriResult::error("File too large to read".to_string()))
            } else if file_data.is_binary {
                Ok(TauriResult::error("Cannot read binary file as text".to_string()))
            } else {
                match file_data.content {
                    Some(content) => Ok(TauriResult::success(content)),
                    None => Ok(TauriResult::error("No content available".to_string())),
                }
            }
        }
        None => Ok(TauriResult::error(smart_result.error.unwrap_or("Unknown error".to_string()))),
    }
}

/// Save file with content
// MOVED TO CORE: Duplicate command moved to core/commands.rs
// #[tauri::command]
pub async fn save_file_impl(path: String, content: String) -> std::result::Result<TauriResult<String>, String> {
    // Security: Validate path first
    let secure_path = match validate_path_security(&path) {
        Ok(p) => p,
        Err(e) => return Ok(TauriResult::error(format!("Security validation failed: {}", e))),
    };
    
    match std::fs::write(&secure_path, content) {
        Ok(_) => Ok(TauriResult::success("File saved successfully".to_string())),
        Err(e) => Ok(TauriResult::error(format!("Failed to save file: {}", e))),
    }
}

/// Create a new file
// MOVED TO CORE: Duplicate command moved to core/commands.rs
// #[tauri::command]
pub async fn create_file_impl(path: String, content: Option<String>) -> Result<String, String> {
    use std::fs;
    
    tracing::info!("Creating file: {}", path);
    
    // Security: Validate path first
    let secure_path = match validate_path_security(&path) {
        Ok(p) => p,
        Err(e) => return Err(format!("Security validation failed: {}", e)),
    };
    
    let file_path = secure_path.as_path();
    
    if file_path.exists() {
        return Err(format!("File already exists: {}", path));
    }
    
    // Create parent directories if they don't exist
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            match fs::create_dir_all(parent) {
                Ok(_) => tracing::debug!("Created parent directories for: {}", path),
                Err(e) => {
                    tracing::error!("Failed to create parent directories: {}", e);
                    return Err(format!("Failed to create parent directories: {}", e));
                }
            }
        }
    }
    
    let file_content = content.unwrap_or_default();
    
    match fs::write(&file_path, file_content) {
        Ok(_) => {
            tracing::info!("File created successfully: {}", path);
            Ok(format!("File created: {}", path))
        }
        Err(e) => {
            tracing::error!("Failed to create file: {}", e);
            Err(format!("Failed to create file: {}", e))
        }
    }
}

/// Delete a file or directory
#[tauri::command]
pub async fn delete_file(
    app_handle: tauri::AppHandle,
    path: String, 
    force: Option<bool>
) -> Result<String, String> {
    use std::fs;
    
    tracing::info!("Deleting file: {} (force: {:?})", path, force);
    
    // Security: Validate path first
    let secure_path = match validate_path_security(&path) {
        Ok(p) => p,
        Err(e) => return Err(format!("Security validation failed: {}", e)),
    };
    
    let file_path = secure_path.as_path();
    
    if !file_path.exists() {
        return Err(format!("File or directory does not exist: {}", path));
    }
    
    let is_force = force.unwrap_or(false);
    let is_directory = file_path.is_dir();
    
    // Store file info before deletion for event emission
    let deletion_info = crate::filesystem::watcher::FileSystemEvent {
        event_type: "deleted".to_string(),
        path: path.clone(),
        is_directory,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };
    
    match fs::metadata(&file_path) {
        Ok(metadata) => {
            if metadata.is_dir() {
                // Delete directory
                if is_force {
                    // Force delete (remove all contents)
                    match fs::remove_dir_all(&file_path) {
                        Ok(_) => {
                            tracing::info!("Directory deleted successfully: {}", path);
                            
                            // Emit file system event for UI update
                            if let Err(e) = app_handle.emit("file-system-change", &deletion_info) {
                                tracing::warn!("Failed to emit deletion event: {}", e);
                            }
                            
                            // Also emit a specific deletion event for better UI handling
                            if let Err(e) = app_handle.emit("file-deleted", &deletion_info) {
                                tracing::warn!("Failed to emit file-deleted event: {}", e);
                            }
                            
                            Ok(format!("Directory deleted: {}", path))
                        }
                        Err(e) => {
                            tracing::error!("Failed to delete directory: {}", e);
                            Err(format!("Failed to delete directory: {}", e))
                        }
                    }
                } else {
                    // Regular delete (directory must be empty)
                    match fs::remove_dir(&file_path) {
                        Ok(_) => {
                            tracing::info!("Empty directory deleted successfully: {}", path);
                            
                            // Emit file system event for UI update
                            if let Err(e) = app_handle.emit("file-system-change", &deletion_info) {
                                tracing::warn!("Failed to emit deletion event: {}", e);
                            }
                            
                            // Also emit a specific deletion event for better UI handling
                            if let Err(e) = app_handle.emit("file-deleted", &deletion_info) {
                                tracing::warn!("Failed to emit file-deleted event: {}", e);
                            }
                            
                            Ok(format!("Directory deleted: {}", path))
                        }
                        Err(e) => {
                            tracing::error!("Failed to delete directory (not empty?): {}", e);
                            Err(format!("Failed to delete directory (may not be empty): {}", e))
                        }
                    }
                }
            } else {
                // Delete file
                match fs::remove_file(&file_path) {
                    Ok(_) => {
                        tracing::info!("File deleted successfully: {}", path);
                        
                        // Emit file system event for UI update
                        if let Err(e) = app_handle.emit("file-system-change", &deletion_info) {
                            tracing::warn!("Failed to emit deletion event: {}", e);
                        }
                        
                        // Also emit a specific deletion event for better UI handling
                        if let Err(e) = app_handle.emit("file-deleted", &deletion_info) {
                            tracing::warn!("Failed to emit file-deleted event: {}", e);
                        }
                        
                        Ok(format!("File deleted: {}", path))
                    }
                    Err(e) => {
                        tracing::error!("Failed to delete file: {}", e);
                        Err(format!("Failed to delete file: {}", e))
                    }
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to get file metadata: {}", e);
            Err(format!("Failed to access file: {}", e))
        }
    }
}

/// Get the application data directory for the current user
#[tauri::command]
pub async fn get_app_data_dir(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;
    
    match app_handle.path().app_data_dir() {
        Ok(path) => {
            let app_data_path = path.to_string_lossy().to_string();
            tracing::info!("App data directory: {}", app_data_path);
            Ok(app_data_path)
        },
        Err(e) => {
            tracing::error!("Failed to get app data directory: {}", e);
            
            // Fallback to home directory + .syntari
            if let Ok(home_dir) = std::env::var("HOME") {
                let fallback_path = format!("{}/.syntari", home_dir);
                tracing::warn!("Using fallback app data directory: {}", fallback_path);
                Ok(fallback_path)
            } else {
                Err(format!("Failed to get app data directory: {}", e))
            }
        }
    }
} 