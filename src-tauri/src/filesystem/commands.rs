// Syntari AI IDE - Filesystem Commands
// File system commands exposed to the frontend

use std::path::Path;
use crate::core::{TauriResult, DirectoryInfo, ScanFilesResult, FileInfoChunk};

#[tauri::command]
pub async fn read_file(path: String) -> std::result::Result<TauriResult<String>, String> {
    tracing::debug!("Reading file: {}", path);
    
    match tokio::fs::read_to_string(&path).await {
        Ok(content) => {
            tracing::debug!("Successfully read file: {} ({} bytes)", path, content.len());
            Ok(TauriResult::success(content))
        }
        Err(e) => {
            tracing::error!("Failed to read file {}: {:?}", path, e);
            Ok(TauriResult::error(format!("Failed to read file: {}", e)))
        }
    }
}

#[tauri::command]
pub async fn save_file(path: String, content: String) -> std::result::Result<TauriResult<String>, String> {
    tracing::debug!("Saving file: {} ({} bytes)", path, content.len());
    
    match tokio::fs::write(&path, &content).await {
        Ok(_) => {
            tracing::info!("Successfully saved file: {}", path);
            Ok(TauriResult::success("File saved successfully".to_string()))
        }
        Err(e) => {
            tracing::error!("Failed to save file {}: {:?}", path, e);
            Ok(TauriResult::error(format!("Failed to save file: {}", e)))
        }
    }
}

#[tauri::command]
pub async fn open_folder_dialog() -> std::result::Result<TauriResult<String>, String> {
    tracing::debug!("Opening folder dialog");
    
    // For now, return an error indicating this needs to be implemented via frontend
    // In Tauri 2.x, dialogs are typically handled via the plugin on the frontend side
    Ok(TauriResult::error("Folder dialog should be handled via frontend plugin".to_string()))
}

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

#[tauri::command]
pub async fn get_directory_mtime(path: String) -> std::result::Result<TauriResult<u64>, String> {
    tracing::debug!("Getting directory mtime for: {}", path);
    
    match tokio::fs::metadata(&path).await {
        Ok(metadata) => {
            match metadata.modified() {
                Ok(time) => {
                    let timestamp = time
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();
                    tracing::debug!("Directory mtime for {}: {}", path, timestamp);
                    Ok(TauriResult::success(timestamp))
                }
                Err(e) => {
                    tracing::error!("Failed to get modification time for {}: {:?}", path, e);
                    Ok(TauriResult::error(format!("Failed to get modification time: {}", e)))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to get metadata for {}: {:?}", path, e);
            Ok(TauriResult::error(format!("Failed to get directory metadata: {}", e)))
        }
    }
}

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

#[tauri::command]
pub async fn scan_files_chunked(
    path: String,
    offset: usize,
    limit: usize,
    ignore_patterns: Option<Vec<String>>,
    include_hidden: Option<bool>
) -> std::result::Result<TauriResult<ScanFilesResult>, String> {
    tracing::debug!("Scanning files in: {} (offset: {}, limit: {})", path, offset, limit);
    
    let include_hidden = include_hidden.unwrap_or(false);
    let ignore_list = ignore_patterns.unwrap_or_else(|| vec![
        ".git".to_string(),
        "node_modules".to_string(),
        "target".to_string(),
        ".next".to_string(),
        "dist".to_string(),
        "build".to_string(),
    ]);
    
    let mut all_files = Vec::new();
    
    fn scan_files_recursive(
        dir_path: &Path,
        depth: u32,
        include_hidden: bool,
        ignore_list: &[String],
        files: &mut Vec<FileInfoChunk>,
    ) -> std::io::Result<()> {
        let entries = std::fs::read_dir(dir_path)?;
        
        for entry in entries {
            let entry = entry?;
            let path = entry.path();
            let name = path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();
            
            // Skip hidden files/directories unless explicitly included
            if !include_hidden && name.starts_with('.') {
                continue;
            }
            
            // Skip ignored directories
            if ignore_list.contains(&name) {
                continue;
            }
            
            if path.is_file() {
                let metadata = entry.metadata()?;
                let size = metadata.len();
                let last_modified = metadata
                    .modified()
                    .unwrap_or(std::time::UNIX_EPOCH)
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();
                
                let extension = path.extension()
                    .and_then(|ext| ext.to_str())
                    .unwrap_or("")
                    .to_string();
                
                files.push(FileInfoChunk {
                    path: path.to_string_lossy().to_string(),
                    name,
                    depth,
                    size,
                    last_modified,
                    extension,
                });
            } else if path.is_dir() {
                // Recursively scan subdirectories
                scan_files_recursive(&path, depth + 1, include_hidden, ignore_list, files)?;
            }
        }
        
        Ok(())
    }
    
    let path_obj = Path::new(&path);
    match scan_files_recursive(path_obj, 0, include_hidden, &ignore_list, &mut all_files) {
        Ok(_) => {
            // Apply pagination
            let total_files = all_files.len();
            let end_index = std::cmp::min(offset + limit, total_files);
            let has_more = end_index < total_files;
            
            let files = if offset < total_files {
                all_files[offset..end_index].to_vec()
            } else {
                Vec::new()
            };
            
            tracing::info!("Scanned {} files (showing {}-{} of {})", files.len(), offset, end_index, total_files);
            
            Ok(TauriResult::success(ScanFilesResult {
                files,
                has_more,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to scan files in {}: {:?}", path, e);
            Ok(TauriResult::error(format!("Failed to scan files: {}", e)))
        }
    }
} 