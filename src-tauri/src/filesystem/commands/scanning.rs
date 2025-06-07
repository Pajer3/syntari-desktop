// Syntari AI IDE - File Scanning Commands
// Advanced scanning and discovery operations

use std::path::Path;
use crate::core::types::{TauriResult, ScanFilesResult, FileInfoChunk};
use ignore::WalkBuilder;

/// VS Code-style chunked file scanning with performance optimizations
#[tauri::command]
pub async fn scan_files_chunked(
    path: String,
    offset: usize,
    limit: usize,
    _ignore_patterns: Option<Vec<String>>,
    include_hidden: Option<bool>
) -> std::result::Result<TauriResult<ScanFilesResult>, String> {
    tracing::debug!("VS Code-style scan: {} (offset: {}, limit: {})", path, offset, limit);
    
    let include_hidden = include_hidden.unwrap_or(false);
    
    // Build ignore walker with aggressive VS Code-style filtering
    let mut builder = WalkBuilder::new(&path);
    builder
        .hidden(!include_hidden)  // Skip hidden files unless explicitly requested
        .ignore(true)            // Respect .gitignore
        .git_ignore(true)        // Respect .gitignore in parent directories
        .git_global(true)        // Respect global .gitignore
        .git_exclude(true)       // Respect .git/info/exclude
        .require_git(false)      // Don't require being in a git repo
        .follow_links(false)     // Don't follow symlinks to avoid cycles
        .max_depth(Some(50));    // Prevent infinite recursion
    
    let walker = builder.build();
    let mut all_files: Vec<FileInfoChunk> = Vec::new();
    
    // Collect files with early bailout if too many (VS Code style)
    const MAX_FILES_SCAN: usize = 100_000; // VS Code-style limit
    let mut scanned_count = 0;
    
    for result in walker {
        // Early bailout for massive directories
        if scanned_count > MAX_FILES_SCAN {
            tracing::warn!("Hit file limit ({}), truncating scan", MAX_FILES_SCAN);
            break;
        }
        
        match result {
            Ok(entry) => {
                let path = entry.path();
                
                // Skip directories - we only want files for this command
                if !path.is_file() {
                    continue;
                }
                
                // Additional size filtering (skip huge files like VS Code does)
                if let Ok(metadata) = path.metadata() {
                    const MAX_FILE_SIZE: u64 = 64 * 1024 * 1024; // 64MB limit like VS Code
                    if metadata.len() > MAX_FILE_SIZE {
                        continue;
                    }
                }
                
                let name = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();
                
                if let Ok(metadata) = path.metadata() {
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
                    
                    all_files.push(FileInfoChunk {
                        path: path.to_string_lossy().to_string(),
                        name,
                        depth: 0,
                        size,
                        last_modified,
                        extension,
                        is_directory: false,
                    });
                    
                    scanned_count += 1;
                }
            }
            Err(_) => continue,
        }
    }
    
    // Apply pagination AFTER filtering (much more efficient)
    let total_files = all_files.len();
    let end_index = std::cmp::min(offset + limit, total_files);
    let has_more = end_index < total_files;
    
    let files = if offset < total_files {
        all_files[offset..end_index].to_vec()
    } else {
        Vec::new()
    };
    
    tracing::info!("VS Code-style scan: {} files (showing {}-{} of {})", 
                   files.len(), offset, end_index, total_files);
    
    Ok(TauriResult::success(ScanFilesResult {
        files,
        has_more,
    }))
}

/// Streaming scanner for progressive loading
#[tauri::command]
pub async fn scan_files_streaming(
    path: String,
    chunk_size: Option<usize>,
    _ignore_patterns: Option<Vec<String>>, // Prefixed with _ to indicate intentionally unused
    include_hidden: Option<bool>
) -> std::result::Result<TauriResult<Vec<FileInfoChunk>>, String> {
    tracing::debug!("Streaming scan: {}", path);
    
    let chunk_size = chunk_size.unwrap_or(50); // Small chunks for responsiveness
    let include_hidden = include_hidden.unwrap_or(false);
    
    // Use same aggressive filtering as above
    let mut builder = WalkBuilder::new(&path);
    builder
        .hidden(!include_hidden)
        .ignore(true)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .require_git(false)
        .follow_links(false)
        .max_depth(Some(20)); // Shallower for streaming
    
    let walker = builder.build();
    let mut files = Vec::with_capacity(chunk_size);
    let mut count = 0;
    
    for result in walker {
        if count >= chunk_size {
            break; // Return first chunk immediately
        }
        
        if let Ok(entry) = result {
            let path = entry.path();
            if path.is_file() {
                if let Ok(metadata) = path.metadata() {
                    // Skip large files
                    if metadata.len() > 10 * 1024 * 1024 { // 10MB limit for streaming
                        continue;
                    }
                    
                    let name = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_string();
                    
                    files.push(FileInfoChunk {
                        path: path.to_string_lossy().to_string(),
                        name,
                        depth: 0, // Simplified for streaming
                        size: metadata.len(),
                        last_modified: metadata
                            .modified()
                            .unwrap_or(std::time::UNIX_EPOCH)
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs(),
                        extension: path.extension()
                            .and_then(|ext| ext.to_str())
                            .unwrap_or("")
                            .to_string(),
                        is_directory: false, // This function only scans files
                    });
                    
                    count += 1;
                }
            }
        }
    }
    
    tracing::info!("Streaming chunk: {} files", files.len());
    Ok(TauriResult::success(files))
}

/// Clean unified scanner - never reads file contents, only metadata
#[tauri::command]
pub async fn scan_everything_clean(
    path: String,
    include_hidden: Option<bool>
) -> std::result::Result<TauriResult<Vec<FileInfoChunk>>, String> {
    tracing::info!("Clean scan (no file content reading): {}", path);
    
    let include_hidden = include_hidden.unwrap_or(true);
    let root_path = Path::new(&path);
    let mut all_items = Vec::new();
    
    // Simple recursive scan - NEVER read file contents, only metadata
    fn scan_recursive(
        dir: &Path, 
        root: &Path, 
        include_hidden: bool, 
        items: &mut Vec<FileInfoChunk>
    ) -> std::io::Result<()> {
        let entries = std::fs::read_dir(dir)?;
        
        for entry in entries {
            let entry = entry?;
            let entry_path = entry.path();
            let file_type = entry.file_type()?;
            
            let name = entry.file_name().to_string_lossy().to_string();
            
            // Skip hidden files if not requested
            if !include_hidden && name.starts_with('.') {
                continue;
            }
            
            // Calculate depth from root
            let depth = entry_path.strip_prefix(root)
                .map(|p| p.components().count().saturating_sub(1) as u32)
                .unwrap_or(0);
            
            // Get metadata - but NEVER read file contents!
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
                
                items.push(FileInfoChunk {
                    path: entry_path.to_string_lossy().to_string(),
                    name,
                    depth,
                    size,
                    last_modified,
                    extension,
                    is_directory,
                });
                
                // Recurse into directories
                if is_directory {
                    let _ = scan_recursive(&entry_path, root, include_hidden, items);
                }
            }
        }
        
        Ok(())
    }
    
    match scan_recursive(root_path, root_path, include_hidden, &mut all_items) {
        Ok(_) => {
            // Sort for consistent tree order
            all_items.sort_by(|a, b| a.path.cmp(&b.path));
            
            tracing::info!("Clean scan complete: {} items", all_items.len());
            Ok(TauriResult::success(all_items))
        }
        Err(e) => {
            tracing::error!("Failed clean scan: {}", e);
            Ok(TauriResult::error(format!("Failed to scan directory: {}", e)))
        }
    }
}

/// List all backup files in a directory recursively
#[tauri::command]
pub async fn list_backup_files(backup_dir: String) -> std::result::Result<TauriResult<Vec<String>>, String> {
    tracing::debug!("Listing backup files in: {}", backup_dir);
    
    let backup_path = Path::new(&backup_dir);
    
    if !backup_path.exists() {
        tracing::warn!("Backup directory does not exist: {}", backup_dir);
        return Ok(TauriResult::success(Vec::new()));
    }
    
    let mut backup_files = Vec::new();
    
    // Walk directory recursively to find backup files
    let walker = WalkBuilder::new(backup_path)
        .hidden(false)
        .parents(false)
        .ignore(false)
        .git_ignore(false)
        .follow_links(false)
        .max_depth(Some(10))
        .build();
    
    for entry in walker {
        match entry {
            Ok(entry) => {
                let path = entry.path();
                if path.is_file() {
                    let file_name = path.file_name()
                        .and_then(|name| name.to_str())
                        .unwrap_or("");
                    
                    // Check if it's a backup file (contains .backup. pattern)
                    if file_name.contains(".backup.") {
                        backup_files.push(path.to_string_lossy().to_string());
                    }
                }
            }
            Err(e) => {
                tracing::warn!("Error walking backup directory: {}", e);
            }
        }
    }
    
    tracing::info!("Found {} backup files in {}", backup_files.len(), backup_dir);
    Ok(TauriResult::success(backup_files))
}

/// DEBUG: Simple test command to verify Tauri command system is working
#[tauri::command]
pub async fn debug_test_command(test_path: String) -> std::result::Result<TauriResult<String>, String> {
    let path = Path::new(&test_path);
    
    if !path.exists() {
        return Ok(TauriResult::error("Test path does not exist".to_string()));
    }
    
    let metadata = match std::fs::metadata(&path) {
        Ok(m) => m,
        Err(e) => return Ok(TauriResult::error(format!("Failed to get metadata: {}", e))),
    };
    
    let info = format!(
        "Path: {}\nExists: {}\nIs file: {}\nIs dir: {}\nSize: {} bytes",
        test_path,
        path.exists(),
        path.is_file(),
        path.is_dir(),
        metadata.len()
    );
    
    Ok(TauriResult::success(info))
} 