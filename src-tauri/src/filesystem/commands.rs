// Syntari AI IDE - Filesystem Commands
// File system commands exposed to the frontend

use std::path::Path;
use crate::core::types::{TauriResult, DirectoryInfo, FileInfoChunk, ScanFilesResult};
use ignore::WalkBuilder;

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
    
    // Add custom ignore patterns (VS Code style noise filtering)
    let default_ignores = vec![
        // Development artifacts
        ".git", "node_modules", "target", ".next", "dist", "build",
        // Python
        "__pycache__", ".pytest_cache", ".mypy_cache", ".venv", "venv", 
        ".env", "*.pyc", "*.pyo", "*.egg-info",
        // JavaScript/TypeScript
        ".turbo", ".vercel", ".nuxt", ".output", "coverage",
        // Rust
        "target", "Cargo.lock",
        // C/C++
        "build", "cmake-build-debug", "cmake-build-release", ".vs",
        // Java
        ".gradle", ".m2", "out",
        // IDEs
        ".vscode", ".idea", ".eclipse", "*.swp", "*.swo",
        // OS
        ".DS_Store", "Thumbs.db", "desktop.ini",
        // Logs
        "logs", "*.log",
        // Archives & Media (large files)
        "*.zip", "*.tar.gz", "*.rar", "*.7z", "*.mp4", "*.avi", "*.mkv",
        "*.jpg", "*.jpeg", "*.png", "*.gif", "*.bmp", "*.tiff",
        "*.pdf", "*.doc", "*.docx", "*.xls", "*.xlsx"
    ];
    
    let ignore_list = ignore_patterns.unwrap_or(default_ignores.iter().map(|s| s.to_string()).collect());
    
    // Apply custom ignore patterns
    for pattern in &ignore_list {
        builder.add_custom_ignore_filename(&format!(".{}ignore", pattern.replace("*", "").replace(".", "")));
    }
    
    // Stream files with aggressive early filtering
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
                
                // Skip files matching ignore patterns
                if ignore_list.iter().any(|pattern| {
                    if pattern.contains('*') {
                        // Simple wildcard matching
                        if pattern.starts_with("*.") {
                            let ext = &pattern[2..];
                            name.ends_with(ext)
                        } else {
                            false
                        }
                    } else {
                        name == *pattern || name.starts_with(pattern)
                    }
                }) {
                    continue;
                }
                
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
                    
                    // Calculate depth from root
                    let depth = path.strip_prefix(&path)
                        .map(|p| p.components().count() as u32)
                        .unwrap_or(0);
                    
                    all_files.push(FileInfoChunk {
                        path: path.to_string_lossy().to_string(),
                        name,
                        depth,
                        size,
                        last_modified,
                        extension,
                        is_directory: false,
                    });
                    
                    scanned_count += 1;
                }
            }
            Err(err) => {
                tracing::debug!("Skipping inaccessible path: {}", err);
                continue;
            }
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
    
    tracing::info!("VS Code-style scan: {} files (showing {}-{} of {}, scanned {})", 
                   files.len(), offset, end_index, total_files, scanned_count);
    
    Ok(TauriResult::success(ScanFilesResult {
        files,
        has_more,
    }))
}

// NEW: Streaming scanner command for progressive loading
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

// Clean unified scanner following ChatGPT's advice - no file content reading!
#[tauri::command]
pub async fn scan_everything_clean(
    path: String,
    include_hidden: Option<bool>
) -> std::result::Result<TauriResult<Vec<FileInfoChunk>>, String> {
    tracing::info!("🚀 Clean scan (no file content reading): {}", path);
    
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
            
            // Use OsString and convert with to_string_lossy (never panics!)
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
                
                // Get extension safely - DON'T filter on extension!
                let extension = if is_directory {
                    String::new()
                } else {
                    entry_path.extension()
                        .and_then(|ext| ext.to_str())
                        .unwrap_or("")
                        .to_string()
                };
                
                items.push(FileInfoChunk {
                    path: entry_path.to_string_lossy().to_string(), // Never panics!
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
            
            tracing::info!("✅ Clean scan complete: {} items", all_items.len());
            if all_items.len() > 0 {
                let sample: Vec<_> = all_items.iter().take(5).map(|f| &f.name).collect();
                tracing::info!("📋 Sample items: {:?}", sample);
            }
            
            Ok(TauriResult::success(all_items))
        }
        Err(e) => {
            tracing::error!("Failed clean scan: {}", e);
            Ok(TauriResult::error(format!("Failed to scan directory: {}", e)))
        }
    }
} 
