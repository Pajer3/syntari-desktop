// Syntari AI IDE - Directory Operations Commands
// Directory scanning, exploration, and management

use std::path::Path;
use crate::core::types::{TauriResult, DirectoryInfo, FileInfoChunk};

/// Check folder permissions (read/write access)
#[tauri::command]
pub async fn check_folder_permissions(path: String) -> std::result::Result<TauriResult<bool>, String> {
    tracing::debug!("Checking folder permissions for: {}", path);
    
    let path_obj = Path::new(&path);
    
    // Check if path exists
    if !path_obj.exists() {
        tracing::warn!("Path does not exist: {}", path);
        return Ok(TauriResult::success(false));
    }
    
    // Check if it's a directory
    if !path_obj.is_dir() {
        tracing::warn!("Path is not a directory: {}", path);
        return Ok(TauriResult::success(false));
    }
    
    // Try to read the directory to check permissions
    match std::fs::read_dir(&path) {
        Ok(_) => {
            tracing::debug!("Successfully verified read permissions for: {}", path);
            
            // Try to create a temporary file to test write permissions
            let temp_file = path_obj.join(".syntari_permission_test");
            let has_write_permission = match std::fs::write(&temp_file, "test") {
                Ok(_) => {
                    // Clean up the test file
                    let _ = std::fs::remove_file(&temp_file);
                    true
                }
                Err(_) => false,
            };
            
            tracing::debug!("Folder permissions check for {}: read=true, write={}", path, has_write_permission);
            Ok(TauriResult::success(has_write_permission))
        }
        Err(e) => {
            tracing::warn!("No read permission for folder {}: {:?}", path, e);
            Ok(TauriResult::success(false))
        }
    }
}

/// Get directory modification time
#[tauri::command]
pub async fn get_directory_mtime(path: String) -> std::result::Result<TauriResult<u64>, String> {
    match std::fs::metadata(&path) {
        Ok(metadata) => {
            match metadata.modified() {
                Ok(time) => {
                    let timestamp = time
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();
                    Ok(TauriResult::success(timestamp))
                }
                Err(e) => Ok(TauriResult::error(format!("Failed to get modification time: {}", e))),
            }
        }
        Err(e) => Ok(TauriResult::error(format!("Failed to read directory metadata: {}", e))),
    }
}

/// Scan directories only (no files)
#[tauri::command]
pub async fn scan_directories_only(
    path: String,
    max_depth: Option<u32>,
    ignore_patterns: Option<Vec<String>>
) -> std::result::Result<TauriResult<Vec<DirectoryInfo>>, String> {
    tracing::debug!("Scanning directories in: {} (max_depth: {:?})", path, max_depth);
    
    let mut directories = Vec::new();
    let ignore_list = ignore_patterns.unwrap_or_else(|| vec![
        ".git".to_string(),
        "node_modules".to_string(),
        "target".to_string(),
        ".next".to_string(),
        "dist".to_string(),
        "build".to_string(),
    ]);
    
    fn scan_dir_recursive(
        dir_path: &Path,
        base_depth: u32,
        current_depth: u32,
        max_depth: Option<u32>,
        ignore_list: &[String],
        directories: &mut Vec<DirectoryInfo>,
    ) -> std::io::Result<()> {
        if let Some(max) = max_depth {
            if current_depth > max {
                return Ok(());
            }
        }
        
        let entries = std::fs::read_dir(dir_path)?;
        
        for entry in entries {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_dir() {
                let name = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();
                
                // Skip ignored directories
                if ignore_list.contains(&name) {
                    continue;
                }
                
                let metadata = entry.metadata()?;
                let last_modified = metadata
                    .modified()
                    .unwrap_or(std::time::UNIX_EPOCH)
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();
                
                directories.push(DirectoryInfo {
                    path: path.to_string_lossy().to_string(),
                    name,
                    depth: current_depth - base_depth,
                    last_modified,
                });
                
                // Recursively scan subdirectories
                scan_dir_recursive(&path, base_depth, current_depth + 1, max_depth, ignore_list, directories)?;
            }
        }
        
        Ok(())
    }
    
    let path_obj = Path::new(&path);
    match scan_dir_recursive(path_obj, 0, 0, max_depth, &ignore_list, &mut directories) {
        Ok(_) => {
            tracing::info!("Scanned {} directories in: {}", directories.len(), path);
            Ok(TauriResult::success(directories))
        }
        Err(e) => {
            tracing::error!("Failed to scan directories in {}: {:?}", path, e);
            Ok(TauriResult::error(format!("Failed to scan directories: {}", e)))
        }
    }
}

/// VS Code-style lazy folder loading command
#[tauri::command]
pub async fn load_folder_contents(
    folder_path: String,
    include_hidden: Option<bool>,
    show_hidden_folders: Option<bool>
) -> std::result::Result<TauriResult<Vec<FileInfoChunk>>, String> {
    tracing::debug!("VS Code lazy load: {}", folder_path);
    
    let include_hidden = include_hidden.unwrap_or(false);
    let show_hidden_folders = show_hidden_folders.unwrap_or(false);
    let folder = Path::new(&folder_path);
    
    if !folder.exists() || !folder.is_dir() {
        return Ok(TauriResult::error("Folder does not exist or is not a directory".to_string()));
    }
    
    let mut contents = Vec::new();
    
    match std::fs::read_dir(folder) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    let entry_path = entry.path();
                    let file_type = entry.file_type();
                    
                    if let Ok(file_type) = file_type {
                        let name = entry.file_name().to_string_lossy().to_string();
                        
                        // Skip hidden files if not requested
                        if !include_hidden && name.starts_with('.') {
                            continue;
                        }
                        
                        // Skip noise directories (configurable)
                        if !show_hidden_folders && file_type.is_dir() && matches!(name.as_str(), 
                            "node_modules" | ".git" | "target" | ".next" | "dist" | "build" | 
                            "__pycache__" | ".pytest_cache" | ".mypy_cache" | ".venv" | "venv"
                        ) {
                            continue;
                        }
                        
                        if let Ok(metadata) = entry.metadata() {
                            let is_directory = file_type.is_dir();
                            let size = if is_directory { 0 } else { metadata.len() };
                            let last_modified = metadata
                                .modified()
                                .unwrap_or(std::time::UNIX_EPOCH)
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_secs();
                            
                            let extension = if is_directory {
                                String::new()
                            } else {
                                entry_path.extension()
                                    .and_then(|ext| ext.to_str())
                                    .unwrap_or("")
                                    .to_string()
                            };
                            
                            // Calculate depth (1 level deeper than parent)
                            let depth = folder_path.matches('/').count() as u32 + 1;
                            
                            contents.push(FileInfoChunk {
                                path: entry_path.to_string_lossy().to_string(),
                                name,
                                depth,
                                size,
                                last_modified,
                                extension,
                                is_directory,
                            });
                        }
                    }
                }
            }
            
            // Sort: directories first, then files, both alphabetically
            contents.sort_by(|a, b| {
                match (a.is_directory, b.is_directory) {
                    (true, false) => std::cmp::Ordering::Less,
                    (false, true) => std::cmp::Ordering::Greater,
                    _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
                }
            });
            
            tracing::debug!("Lazy loaded {} items from {}", contents.len(), folder_path);
            Ok(TauriResult::success(contents))
        }
        Err(e) => {
            tracing::warn!("Failed to read folder {}: {}", folder_path, e);
            Ok(TauriResult::error(format!("Failed to read folder: {}", e)))
        }
    }
}

/// VS Code-style root level only loading command
#[tauri::command]
pub async fn load_root_items(
    root_path: String,
    include_hidden: Option<bool>,
    show_hidden_folders: Option<bool>
) -> std::result::Result<TauriResult<Vec<FileInfoChunk>>, String> {
    tracing::info!("VS Code root load: {}", root_path);
    
    let include_hidden = include_hidden.unwrap_or(false);
    let show_hidden_folders = show_hidden_folders.unwrap_or(false);
    let root = Path::new(&root_path);
    
    if !root.exists() || !root.is_dir() {
        tracing::warn!("Root path does not exist or is not a directory: {}", root_path);
        return Ok(TauriResult::error("Root path does not exist or is not a directory".to_string()));
    }
    
    let mut root_items = Vec::new();
    
    match std::fs::read_dir(root) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    let entry_path = entry.path();
                    let file_type = entry.file_type();
                    
                    if let Ok(file_type) = file_type {
                        let name = entry.file_name().to_string_lossy().to_string();
                        
                        // Skip hidden files if not requested
                        if !include_hidden && name.starts_with('.') {
                            continue;
                        }
                        
                        // Skip noise directories at root level (configurable)
                        if !show_hidden_folders && file_type.is_dir() && matches!(name.as_str(), 
                            "node_modules" | ".git" | "target" | ".next" | "dist" | "build" | 
                            "__pycache__" | ".pytest_cache" | ".mypy_cache" | ".venv" | "venv" | ".env"
                        ) {
                            continue;
                        }
                        
                        if let Ok(metadata) = entry.metadata() {
                            let is_directory = file_type.is_dir();
                            let size = if is_directory { 0 } else { metadata.len() };
                            let last_modified = metadata
                                .modified()
                                .unwrap_or(std::time::UNIX_EPOCH)
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_secs();
                            
                            let extension = if is_directory {
                                String::new()
                            } else {
                                entry_path.extension()
                                    .and_then(|ext| ext.to_str())
                                    .unwrap_or("")
                                    .to_string()
                            };
                            
                            root_items.push(FileInfoChunk {
                                path: entry_path.to_string_lossy().to_string(),
                                name,
                                depth: 0, // Root level
                                size,
                                last_modified,
                                extension,
                                is_directory,
                            });
                        }
                    }
                }
            }
            
            // Sort: directories first, then files, both alphabetically
            root_items.sort_by(|a, b| {
                match (a.is_directory, b.is_directory) {
                    (true, false) => std::cmp::Ordering::Less,
                    (false, true) => std::cmp::Ordering::Greater,
                    _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
                }
            });
            
            tracing::info!("Root loaded {} items", root_items.len());
            Ok(TauriResult::success(root_items))
        }
        Err(e) => {
            tracing::warn!("Failed to read root folder {}: {}", root_path, e);
            Ok(TauriResult::error(format!("Failed to read root folder: {}", e)))
        }
    }
}

/// Create directory recursively (equivalent to `mkdir -p`)
#[tauri::command]
pub async fn create_dir_all(path: String) -> std::result::Result<TauriResult<String>, String> {
    tracing::debug!("Creating directory recursively: {}", path);
    
    match std::fs::create_dir_all(&path) {
        Ok(_) => {
            tracing::info!("Successfully created directory: {}", path);
            Ok(TauriResult::success("Directory created successfully".to_string()))
        }
        Err(e) => {
            tracing::error!("Failed to create directory {}: {}", path, e);
            Ok(TauriResult::error(format!("Failed to create directory: {}", e)))
        }
    }
}

/// Create a new directory
#[tauri::command]
pub async fn create_directory(path: String) -> Result<String, String> {
    use std::fs;
    use std::path::Path;
    
    tracing::info!("Creating directory: {}", path);
    
    let dir_path = Path::new(&path);
    
    if dir_path.exists() {
        return Err(format!("Directory already exists: {}", path));
    }
    
    match fs::create_dir_all(&dir_path) {
        Ok(_) => {
            tracing::info!("Directory created successfully: {}", path);
            Ok(format!("Directory created: {}", path))
        }
        Err(e) => {
            tracing::error!("Failed to create directory: {}", e);
            Err(format!("Failed to create directory: {}", e))
        }
    }
} 