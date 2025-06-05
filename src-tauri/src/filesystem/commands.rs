// Syntari AI IDE - Filesystem Commands
// VS Code-style file operations with size guards and performance optimizations

use std::path::Path;
use crate::core::types::{TauriResult, DirectoryInfo, FileInfoChunk, ScanFilesResult};
use ignore::WalkBuilder;
// use tauri::State;
// use crate::filesystem::service::FilesystemService;

// VS Code file size limits
const MAX_EDITOR_FILE_SIZE: u64 = 64 * 1024 * 1024; // 64MB - refuse to tokenize
const MAX_SAFE_FILE_SIZE: u64 = 256 * 1024 * 1024;  // 256MB - hex mode only
const LARGE_FILE_WARNING: u64 = 1024 * 1024;        // 1MB - show warning

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
#[tauri::command]
pub async fn read_file_smart(path: String) -> std::result::Result<TauriResult<FileReadResult>, String> {
    let path = Path::new(&path);
    
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
    let smart_result = read_file_smart(path).await?;
    
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

#[tauri::command]
pub async fn save_file(path: String, content: String) -> std::result::Result<TauriResult<String>, String> {
    match std::fs::write(&path, content) {
        Ok(_) => Ok(TauriResult::success("File saved successfully".to_string())),
        Err(e) => Ok(TauriResult::error(format!("Failed to save file: {}", e))),
    }
}

#[tauri::command]
pub async fn open_folder_dialog() -> std::result::Result<TauriResult<Option<String>>, String> {
    tracing::debug!("Opening folder dialog");
    
    // Use the proper Tauri 2.x dialog API
    // Note: This should actually be called from the frontend, but providing backend fallback
    match std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")) {
        Ok(home_dir) => {
            tracing::info!("Folder dialog requested. Default to home: {}", home_dir);
            // Return None to indicate the frontend should handle this
            Ok(TauriResult::success(None))
        }
        Err(_) => {
            tracing::warn!("Could not determine home directory for folder dialog");
            Ok(TauriResult::success(None))
        }
    }
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

// NEW: VS Code-style lazy folder loading command
#[tauri::command]
pub async fn load_folder_contents(
    folder_path: String,
    include_hidden: Option<bool>,
    show_hidden_folders: Option<bool>
) -> std::result::Result<TauriResult<Vec<FileInfoChunk>>, String> {
    tracing::debug!("🔍 VS Code lazy load: {}", folder_path);
    
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
            
            tracing::debug!("📁 Lazy loaded {} items from {}", contents.len(), folder_path);
            Ok(TauriResult::success(contents))
        }
        Err(e) => {
            tracing::warn!("Failed to read folder {}: {}", folder_path, e);
            Ok(TauriResult::error(format!("Failed to read folder: {}", e)))
        }
    }
}

// VS Code-style root level only loading command
#[tauri::command]
pub async fn load_root_items(
    root_path: String,
    include_hidden: Option<bool>,
    show_hidden_folders: Option<bool>
) -> std::result::Result<TauriResult<Vec<FileInfoChunk>>, String> {
    tracing::info!("🏠 VS Code root load: {}", root_path);
    
    let include_hidden = include_hidden.unwrap_or(false);
    let show_hidden_folders = show_hidden_folders.unwrap_or(false);
    let root = Path::new(&root_path);
    
    // Debug logging
    tracing::info!("📂 Path exists: {}", root.exists());
    tracing::info!("📂 Is directory: {}", root.is_dir());
    tracing::info!("📂 Include hidden: {}", include_hidden);
    tracing::info!("📂 Show hidden folders: {}", show_hidden_folders);
    
    if !root.exists() || !root.is_dir() {
        tracing::warn!("❌ Root path does not exist or is not a directory: {}", root_path);
        return Ok(TauriResult::error("Root path does not exist or is not a directory".to_string()));
    }
    
    let mut root_items = Vec::new();
    
    match std::fs::read_dir(root) {
        Ok(entries) => {
            let mut entry_count = 0;
            for entry in entries {
                entry_count += 1;
                if let Ok(entry) = entry {
                    let entry_path = entry.path();
                    let file_type = entry.file_type();
                    
                    if let Ok(file_type) = file_type {
                        let name = entry.file_name().to_string_lossy().to_string();
                        
                        tracing::debug!("🔍 Processing entry: {} (hidden: {}, is_dir: {})", 
                                       name, name.starts_with('.'), file_type.is_dir());
                        
                        // Skip hidden files if not requested
                        if !include_hidden && name.starts_with('.') {
                            tracing::debug!("⏭️ Skipping hidden: {}", name);
                            continue;
                        }
                        
                        // Skip noise directories at root level (configurable)
                        if !show_hidden_folders && file_type.is_dir() && matches!(name.as_str(), 
                            "node_modules" | ".git" | "target" | ".next" | "dist" | "build" | 
                            "__pycache__" | ".pytest_cache" | ".mypy_cache" | ".venv" | "venv" | ".env"
                        ) {
                            tracing::debug!("⏭️ Skipping noise directory: {}", name);
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
                            
                            tracing::debug!("✅ Added: {} ({})", 
                                           root_items.last().unwrap().name,
                                           if is_directory { "dir" } else { "file" });
                        }
                    }
                }
            }
            
            tracing::info!("📊 Processed {} total entries, added {} items", entry_count, root_items.len());
            
            // Sort: directories first, then files, both alphabetically
            root_items.sort_by(|a, b| {
                match (a.is_directory, b.is_directory) {
                    (true, false) => std::cmp::Ordering::Less,
                    (false, true) => std::cmp::Ordering::Greater,
                    _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
                }
            });
            
            tracing::info!("🏠 Root loaded {} items", root_items.len());
            Ok(TauriResult::success(root_items))
        }
        Err(e) => {
            tracing::warn!("❌ Failed to read root folder {}: {}", root_path, e);
            Ok(TauriResult::error(format!("Failed to read root folder: {}", e)))
        }
    }
}

// DEBUG: Simple test command to verify Tauri command system is working
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

// Search functionality for project-wide search
#[derive(serde::Serialize, serde::Deserialize)]
pub struct SearchOptions {
    #[serde(rename = "caseSensitive")]
    case_sensitive: bool,
    #[serde(rename = "wholeWord")]
    whole_word: bool,
    #[serde(rename = "useRegex")]
    use_regex: bool,
    #[serde(rename = "includeFileTypes")]
    include_file_types: Vec<String>,
    #[serde(rename = "excludeFileTypes")]
    exclude_file_types: Vec<String>,
    #[serde(rename = "excludeDirectories")]
    exclude_directories: Vec<String>,
}

#[derive(serde::Serialize)]
pub struct SearchMatch {
    file: String,
    line: u32,
    column: u32,
    text: String,
    #[serde(rename = "matchStart")]
    match_start: u32,
    #[serde(rename = "matchEnd")]
    match_end: u32,
}

#[derive(serde::Serialize)]
pub struct SearchResult {
    file: String,
    matches: Vec<SearchMatch>,
    #[serde(rename = "totalMatches")]
    total_matches: u32,
}

#[derive(serde::Serialize)]
pub struct SearchData {
    results: Vec<SearchResult>,
    #[serde(rename = "totalMatches")]
    total_matches: u32,
    #[serde(rename = "filesSearched")]
    files_searched: u32,
    #[serde(rename = "totalFiles")]
    total_files: u32,
}

#[tauri::command]
pub async fn search_in_project(
    project_path: String,
    query: String,
    options: SearchOptions,
) -> std::result::Result<TauriResult<SearchData>, String> {
    use regex::Regex;
    use std::collections::HashSet;
    
    tracing::debug!("Starting project search: {} in {}", query, project_path);
    
    if query.trim().is_empty() {
        return Ok(TauriResult::error("Search query cannot be empty".to_string()));
    }
    
    let project_path = Path::new(&project_path);
    if !project_path.exists() || !project_path.is_dir() {
        return Ok(TauriResult::error("Invalid project path".to_string()));
    }
    
    // Build search regex
    let search_regex = if options.use_regex {
        match Regex::new(&query) {
            Ok(r) => r,
            Err(e) => return Ok(TauriResult::error(format!("Invalid regex: {}", e))),
        }
    } else {
        let escaped_query = regex::escape(&query);
        let pattern = if options.whole_word {
            format!(r"\b{}\b", escaped_query)
        } else {
            escaped_query
        };
        
        let flags = if options.case_sensitive { "" } else { "(?i)" };
        match Regex::new(&format!("{}{}", flags, pattern)) {
            Ok(r) => r,
            Err(e) => return Ok(TauriResult::error(format!("Failed to create search regex: {}", e))),
        }
    };
    
    // Convert file type filters to sets for faster lookup
    let include_types: HashSet<_> = options.include_file_types.iter().map(|s| s.as_str()).collect();
    let exclude_types: HashSet<_> = options.exclude_file_types.iter().map(|s| s.as_str()).collect();
    let exclude_dirs: HashSet<_> = options.exclude_directories.iter().map(|s| s.as_str()).collect();
    
    // Use ignore crate for gitignore support and better performance
    let mut builder = WalkBuilder::new(project_path);
    builder
        .hidden(false) // Include hidden files for now
        .git_ignore(true)
        .git_exclude(true)
        .git_global(true)
        .max_depth(Some(20)); // Reasonable depth limit
    
    let walker = builder.build();
    
    let mut results = Vec::new();
    let mut total_matches = 0;
    let mut files_searched = 0;
    let mut total_files = 0;
    
    // Count total files first (for progress)
    for entry in builder.build() {
        if let Ok(entry) = entry {
            if entry.path().is_file() {
                total_files += 1;
            }
        }
    }
    
    // Perform search
    for entry in walker {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        
        let path = entry.path();
        
        // Skip directories
        if !path.is_file() {
            continue;
        }
        
        // Check excluded directories
        if let Some(parent) = path.parent() {
            if exclude_dirs.iter().any(|&dir| parent.to_string_lossy().contains(dir)) {
                continue;
            }
        }
        
        // Check file extension filters
        if let Some(extension) = path.extension().and_then(|ext| ext.to_str()) {
            let ext_with_dot = format!(".{}", extension);
            
            // If include filters are specified, file must match one of them
            if !include_types.is_empty() && !include_types.contains(ext_with_dot.as_str()) {
                continue;
            }
            
            // Skip if file matches exclude filter
            if exclude_types.contains(ext_with_dot.as_str()) {
                continue;
            }
        }
        
        files_searched += 1;
        
        // Read and search file content
        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue, // Skip binary files or files we can't read
        };
        
        let mut file_matches = Vec::new();
        
        // Search line by line for better match reporting
        for (line_num, line) in content.lines().enumerate() {
            for mat in search_regex.find_iter(line) {
                let match_obj = SearchMatch {
                    file: path.to_string_lossy().to_string(),
                    line: (line_num + 1) as u32,
                    column: (mat.start() + 1) as u32,
                    text: line.to_string(),
                    match_start: mat.start() as u32,
                    match_end: mat.end() as u32,
                };
                file_matches.push(match_obj);
                total_matches += 1;
            }
        }
        
        // Add file result if matches found
        if !file_matches.is_empty() {
            let file_result = SearchResult {
                file: path.to_string_lossy().to_string(),
                total_matches: file_matches.len() as u32,
                matches: file_matches,
            };
            results.push(file_result);
        }
        
        // Prevent excessive memory usage for very large searches
        if total_matches > 10000 {
            tracing::warn!("Search stopped at 10,000 matches to prevent memory issues");
            break;
        }
    }
    
    let search_data = SearchData {
        results,
        total_matches,
        files_searched,
        total_files,
    };
    
    tracing::debug!(
        "Search completed: {} matches in {} files (searched {} of {} files)",
        total_matches, search_data.results.len(), files_searched, total_files
    );
    
    Ok(TauriResult::success(search_data))
}

// Streaming/chunked search for better performance
#[tauri::command]
pub async fn search_in_project_streaming(
    project_path: String,
    query: String,
    options: SearchOptions,
    max_results: Option<u32>,
) -> std::result::Result<TauriResult<SearchData>, String> {
    use regex::Regex;
    use std::collections::HashSet;
    
    tracing::info!("🔍 Starting streaming search in project: {} for query: {}", project_path, query);
    
    if query.trim().is_empty() || query.trim().len() < 2 {
        return Ok(TauriResult::error("Search query must be at least 2 characters".to_string()));
    }
    
    let max_results = max_results.unwrap_or(1000); // Default limit
    let project_path = Path::new(&project_path);
    
    if !project_path.exists() || !project_path.is_dir() {
        return Ok(TauriResult::error("Invalid project path".to_string()));
    }
    
    // Build search regex
    let search_regex = if options.use_regex {
        match Regex::new(&query) {
            Ok(r) => r,
            Err(e) => return Ok(TauriResult::error(format!("Invalid regex: {}", e))),
        }
    } else {
        let escaped_query = regex::escape(&query);
        let pattern = if options.whole_word {
            format!(r"\b{}\b", escaped_query)
        } else {
            escaped_query
        };
        
        let flags = if options.case_sensitive { "" } else { "(?i)" };
        match Regex::new(&format!("{}{}", flags, pattern)) {
            Ok(r) => r,
            Err(e) => return Ok(TauriResult::error(format!("Failed to create search regex: {}", e))),
        }
    };
    
    // Convert file type filters to sets for faster lookup
    let include_types: HashSet<_> = options.include_file_types.iter().map(|s| s.as_str()).collect();
    let exclude_types: HashSet<_> = options.exclude_file_types.iter().map(|s| s.as_str()).collect();
    let exclude_dirs: HashSet<_> = options.exclude_directories.iter().map(|s| s.as_str()).collect();
    
    let start_time = std::time::Instant::now();
    let mut results = Vec::new();
    let mut total_matches = 0;
    let mut files_searched = 0;
    let mut total_files_found = 0;
    
    // Use ignore walker for better gitignore support
    let walker = WalkBuilder::new(project_path)
        .hidden(false)
        .parents(true)
        .ignore(true)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .require_git(false)
        .follow_links(false)
        .max_depth(Some(20))
        .build();
    
    for entry in walker {
        if total_matches >= max_results {
            tracing::info!("🔍 Reached max results limit: {}", max_results);
            break;
        }
        
        match entry {
            Ok(entry) => {
                let path = entry.path();
                if path.is_file() {
                    total_files_found += 1;
                    
                    // Apply file type filters
                    if !is_file_type_allowed_new(path, &include_types, &exclude_types, &exclude_dirs) {
                        continue;
                    }
                    
                    files_searched += 1;
                    
                    // Search in file
                    match search_in_file_impl(path, &search_regex, &options) {
                        Ok(file_matches) => {
                            if !file_matches.is_empty() {
                                let matches_count = file_matches.len() as u32;
                                total_matches += matches_count;
                                results.push(SearchResult {
                                    file: path.to_string_lossy().to_string(),
                                    matches: file_matches,
                                    total_matches: matches_count,
                                });
                            }
                        }
                        Err(e) => {
                            tracing::warn!("Error searching file {:?}: {}", path, e);
                        }
                    }
                }
            }
            Err(e) => {
                tracing::warn!("Error walking directory: {}", e);
            }
        }
        
        // Early termination check for performance
        if total_matches >= max_results {
            break;
        }
    }
    
    let search_duration = start_time.elapsed();
    tracing::info!(
        "🔍 Search completed in {:.2}ms: {} matches in {} files (searched {} of {} total files)",
        search_duration.as_millis(),
        total_matches,
        results.len(),
        files_searched,
        total_files_found
    );
    
    Ok(TauriResult::success(SearchData {
        results,
        total_matches,
        files_searched,
        total_files: total_files_found,
    }))
}

// Helper function for file type filtering
fn is_file_type_allowed_new(
    path: &Path,
    include_types: &std::collections::HashSet<&str>,
    exclude_types: &std::collections::HashSet<&str>,
    exclude_dirs: &std::collections::HashSet<&str>,
) -> bool {
    // Check excluded directories
    if let Some(parent) = path.parent() {
        if exclude_dirs.iter().any(|&dir| parent.to_string_lossy().contains(dir)) {
            return false;
        }
    }
    
    // Check file extension filters
    if let Some(extension) = path.extension().and_then(|ext| ext.to_str()) {
        let ext_with_dot = format!(".{}", extension);
        
        // If include filters are specified, file must match one of them
        if !include_types.is_empty() && !include_types.contains(ext_with_dot.as_str()) {
            return false;
        }
        
        // Skip if file matches exclude filter
        if exclude_types.contains(ext_with_dot.as_str()) {
            return false;
        }
    }
    
    true
}

// Helper function for searching in a single file
fn search_in_file_impl(
    path: &Path,
    search_regex: &regex::Regex,
    _options: &SearchOptions,
) -> Result<Vec<SearchMatch>, Box<dyn std::error::Error>> {
    // Skip very large files for performance
    if let Ok(metadata) = path.metadata() {
        const MAX_FILE_SIZE: u64 = 1024 * 1024; // 1MB limit
        if metadata.len() > MAX_FILE_SIZE {
            return Ok(Vec::new());
        }
    }
    
    let content = std::fs::read_to_string(path)?;
    let mut file_matches = Vec::new();
    
    const MAX_MATCHES_PER_FILE: usize = 20;
    
    for (line_num, line) in content.lines().enumerate() {
        if file_matches.len() >= MAX_MATCHES_PER_FILE {
            break;
        }
        
        for mat in search_regex.find_iter(line) {
            if file_matches.len() >= MAX_MATCHES_PER_FILE {
                break;
            }
            
            file_matches.push(SearchMatch {
                file: path.to_string_lossy().to_string(),
                line: (line_num + 1) as u32,
                column: (mat.start() + 1) as u32,
                text: line.to_string(),
                match_start: mat.start() as u32,
                match_end: mat.end() as u32,
            });
        }
    }
    
    Ok(file_matches)
}

// ================================
// BACKUP DIRECTORY MANAGEMENT (VS Code Style)
// ================================

/// Create directory recursively (equivalent to `mkdir -p`)
#[tauri::command]
pub async fn create_dir_all(path: String) -> std::result::Result<TauriResult<String>, String> {
    tracing::debug!("Creating directory recursively: {}", path);
    
    match std::fs::create_dir_all(&path) {
        Ok(_) => {
            tracing::info!("✅ Successfully created directory: {}", path);
            Ok(TauriResult::success("Directory created successfully".to_string()))
        }
        Err(e) => {
            tracing::error!("❌ Failed to create directory {}: {}", path, e);
            Ok(TauriResult::error(format!("Failed to create directory: {}", e)))
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

/// Delete a file or directory
#[tauri::command]
pub async fn delete_file(path: String, force: Option<bool>) -> Result<String, String> {
    use std::fs;
    use std::path::Path;
    
    println!("🗑️ [RUST] Deleting file: {} (force: {:?})", path, force);
    
    let file_path = Path::new(&path);
    
    if !file_path.exists() {
        return Err(format!("File or directory does not exist: {}", path));
    }
    
    let is_force = force.unwrap_or(false);
    
    match fs::metadata(&file_path) {
        Ok(metadata) => {
            if metadata.is_dir() {
                // Delete directory
                if is_force {
                    // Force delete (remove all contents)
                    match fs::remove_dir_all(&file_path) {
                        Ok(_) => {
                            println!("✅ [RUST] Directory deleted successfully: {}", path);
                            Ok(format!("Directory deleted: {}", path))
                        }
                        Err(e) => {
                            println!("❌ [RUST] Failed to delete directory: {}", e);
                            Err(format!("Failed to delete directory: {}", e))
                        }
                    }
                } else {
                    // Regular delete (directory must be empty)
                    match fs::remove_dir(&file_path) {
                        Ok(_) => {
                            println!("✅ [RUST] Empty directory deleted successfully: {}", path);
                            Ok(format!("Directory deleted: {}", path))
                        }
                        Err(e) => {
                            println!("❌ [RUST] Failed to delete directory (not empty?): {}", e);
                            Err(format!("Failed to delete directory (may not be empty): {}", e))
                        }
                    }
                }
            } else {
                // Delete file
                match fs::remove_file(&file_path) {
                    Ok(_) => {
                        println!("✅ [RUST] File deleted successfully: {}", path);
                        Ok(format!("File deleted: {}", path))
                    }
                    Err(e) => {
                        println!("❌ [RUST] Failed to delete file: {}", e);
                        Err(format!("Failed to delete file: {}", e))
                    }
                }
            }
        }
        Err(e) => {
            println!("❌ [RUST] Failed to get file metadata: {}", e);
            Err(format!("Failed to access file: {}", e))
        }
    }
}

/// Create a new file
#[tauri::command]
pub async fn create_file(path: String, content: Option<String>) -> Result<String, String> {
    use std::fs;
    use std::path::Path;
    
    println!("📄 [RUST] Creating file: {}", path);
    
    let file_path = Path::new(&path);
    
    if file_path.exists() {
        return Err(format!("File already exists: {}", path));
    }
    
    // Create parent directories if they don't exist
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            match fs::create_dir_all(parent) {
                Ok(_) => println!("📁 [RUST] Created parent directories for: {}", path),
                Err(e) => {
                    println!("❌ [RUST] Failed to create parent directories: {}", e);
                    return Err(format!("Failed to create parent directories: {}", e));
                }
            }
        }
    }
    
    let file_content = content.unwrap_or_default();
    
    match fs::write(&file_path, file_content) {
        Ok(_) => {
            println!("✅ [RUST] File created successfully: {}", path);
            Ok(format!("File created: {}", path))
        }
        Err(e) => {
            println!("❌ [RUST] Failed to create file: {}", e);
            Err(format!("Failed to create file: {}", e))
        }
    }
}

/// Create a new directory
#[tauri::command]
pub async fn create_directory(path: String) -> Result<String, String> {
    use std::fs;
    use std::path::Path;
    
    println!("📁 [RUST] Creating directory: {}", path);
    
    let dir_path = Path::new(&path);
    
    if dir_path.exists() {
        return Err(format!("Directory already exists: {}", path));
    }
    
    match fs::create_dir_all(&dir_path) {
        Ok(_) => {
            println!("✅ [RUST] Directory created successfully: {}", path);
            Ok(format!("Directory created: {}", path))
        }
        Err(e) => {
            println!("❌ [RUST] Failed to create directory: {}", e);
            Err(format!("Failed to create directory: {}", e))
        }
    }
} 
