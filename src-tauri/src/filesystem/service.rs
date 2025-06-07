// Syntari AI IDE - High-Performance Filesystem Service
// VS Code-inspired string interning and performance optimizations

use string_interner::{StringInterner, DefaultSymbol, backend::StringBackend};
use std::collections::HashMap;
use std::sync::RwLock;
use std::path::Path;
use crate::core::{AppResult, AppError};

/// VS Code-style string interning for massive memory savings
/// File paths dominate memory usage - interning cuts them to 4-byte handles
pub struct FilePathInterner {
    interner: RwLock<StringInterner<StringBackend>>,
    reverse_map: RwLock<HashMap<DefaultSymbol, String>>,
}

impl FilePathInterner {
    pub fn new() -> Self {
        Self {
            interner: RwLock::new(StringInterner::new()),
            reverse_map: RwLock::new(HashMap::new()),
        }
    }
    
    /// Intern a file path, returning a 4-byte symbol
    pub fn intern_path(&self, path: &str) -> DefaultSymbol {
        let mut interner = self.interner.write().unwrap();
        let symbol = interner.get_or_intern(path);
        
        // Keep reverse mapping for lookups
        let mut reverse = self.reverse_map.write().unwrap();
        reverse.insert(symbol, path.to_string());
        
        symbol
    }
    
    /// Resolve a symbol back to the original path
    pub fn resolve_path(&self, symbol: DefaultSymbol) -> Option<String> {
        let reverse = self.reverse_map.read().unwrap();
        reverse.get(&symbol).cloned()
    }
    
    /// Get memory usage statistics
    pub fn memory_stats(&self) -> (usize, usize) {
        let interner = self.interner.read().unwrap();
        let reverse = self.reverse_map.read().unwrap();
        (interner.len(), reverse.len())
    }
}

/// VS Code-style optimized file node with interned strings
#[derive(Debug, Clone)]
pub struct OptimizedFileNode {
    pub path_symbol: DefaultSymbol,
    pub name_symbol: DefaultSymbol,
    pub extension: Option<String>, // Keep extension as string for now
    pub size: Option<u64>,
    pub is_directory: bool,
    pub depth: usize,
    pub last_modified: Option<u64>,
    pub icon_id: String,
    pub has_children: bool,
}

impl OptimizedFileNode {
    pub fn get_path(&self, interner: &FilePathInterner) -> Option<String> {
        interner.resolve_path(self.path_symbol)
    }
    
    pub fn get_name(&self, interner: &FilePathInterner) -> Option<String> {
        interner.resolve_path(self.name_symbol)
    }
}

/// High-performance filesystem service with VS Code optimizations
pub struct FilesystemService {
    path_interner: FilePathInterner,
    icon_cache: HashMap<String, String>,
    
    // Performance metrics
    scan_count: u64,
    total_nodes: u64,
    memory_saved_bytes: u64,
}

impl FilesystemService {
    pub fn new() -> Self {
        Self {
            path_interner: FilePathInterner::new(),
            icon_cache: HashMap::new(),
            scan_count: 0,
            total_nodes: 0,
            memory_saved_bytes: 0,
        }
    }
    
    /// Validate file operation before execution
    pub fn validate_file_operation(&self, operation: &str, file_path: &str) -> AppResult<()> {
        if file_path.trim().is_empty() {
            return Err(AppError::validation_with_field(
                "EMPTY_PATH",
                &format!("{} operation failed: File path cannot be empty", operation),
                "file_path"
            ));
        }

        // Check for invalid characters in path
        let invalid_chars = ['<', '>', ':', '"', '|', '?', '*'];
        let has_invalid_chars = invalid_chars.iter().any(|&char| file_path.contains(char));
        
        if has_invalid_chars {
            return Err(AppError::validation_with_field(
                "INVALID_CHARS",
                &format!("{} operation failed: File path contains invalid characters", operation),
                "file_path"
            ));
        }

        // Check path length
        if file_path.len() > 260 { // Windows MAX_PATH limitation
            return Err(AppError::validation_with_field(
                "PATH_TOO_LONG",
                &format!("{} operation failed: File path is too long", operation),
                "file_path"
            ));
        }

        Ok(())
    }
    
    /// Check if a file exists and is accessible
    pub async fn file_exists(&self, file_path: &str) -> AppResult<bool> {
        self.validate_file_operation("existence_check", file_path)?;
        
        let path = Path::new(file_path);
        Ok(path.exists() && path.is_file())
    }
    
    /// Check if a directory exists and is accessible
    pub async fn dir_exists(&self, dir_path: &str) -> AppResult<bool> {
        self.validate_file_operation("existence_check", dir_path)?;
        
        let path = Path::new(dir_path);
        Ok(path.exists() && path.is_dir())
    }
    
    /// Get file metadata safely
    pub async fn get_file_metadata(&self, file_path: &str) -> AppResult<std::fs::Metadata> {
        self.validate_file_operation("metadata_read", file_path)?;
        
        std::fs::metadata(file_path)
            .map_err(|e| AppError::filesystem_with_path(
                "METADATA_READ_FAILED",
                &format!("Failed to read file metadata: {}", e),
                file_path
            ))
    }
    
    /// VS Code-style optimized directory scanning
    pub async fn scan_directory_optimized(&mut self, root_path: &str) -> AppResult<Vec<OptimizedFileNode>> {
        self.validate_file_operation("directory_scan", root_path)?;
        
        let start_time = std::time::Instant::now();
        self.scan_count += 1;
        
        let mut nodes = Vec::new();
        let mut total_string_bytes: u64 = 0;
        
        // Use walkdir with ignore patterns (like VS Code)
        let walker = ignore::WalkBuilder::new(root_path)
            .hidden(false) // Show hidden files but exclude specific patterns
            .ignore(true)  // Respect .gitignore
            .git_ignore(true)
            .build();
        
        for entry in walker {
            let entry = entry.map_err(|e| AppError::filesystem_with_path(
                "WALK_ERROR",
                &format!("Walk error: {}", e),
                root_path
            ))?;
            
            let path = entry.path();
            
            // Calculate memory impact
            let path_str = path.to_string_lossy();
            let name_str = path.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| path_str.to_string());
            
            total_string_bytes += (path_str.len() + name_str.len()) as u64;
            
            // Intern the strings
            let path_symbol = self.path_interner.intern_path(&path_str);
            let name_symbol = self.path_interner.intern_path(&name_str);
            
            let metadata = entry.metadata().ok();
            let is_directory = metadata.as_ref().map_or(false, |m| m.is_dir());
            let size = metadata.as_ref().and_then(|m| if m.is_file() { Some(m.len()) } else { None });
            
            let extension = if !is_directory {
                path.extension().map(|ext| ext.to_string_lossy().to_lowercase())
            } else {
                None
            };
            
            let icon_id = self.get_cached_icon_id(extension.as_deref(), is_directory);
            
            // Calculate depth
            let depth = path.components().count().saturating_sub(
                Path::new(root_path).components().count()
            );
            
            let node = OptimizedFileNode {
                path_symbol,
                name_symbol,
                extension,
                size,
                is_directory,
                depth,
                last_modified: metadata.and_then(|m| {
                    m.modified().ok().and_then(|t| {
                        t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| d.as_secs())
                    })
                }),
                icon_id,
                has_children: is_directory,
            };
            
            nodes.push(node);
        }
        
        // Update metrics (8 bytes per two symbols vs original string lengths)
        let symbols_bytes = nodes.len() as u64 * 8; // Two symbols per node
        self.total_nodes += nodes.len() as u64;
        self.memory_saved_bytes += total_string_bytes.saturating_sub(symbols_bytes);
        
        let elapsed = start_time.elapsed();
        
        tracing::info!("VS Code-style scan complete:");
        tracing::info!("   📁 {} files/directories in {:?}", nodes.len(), elapsed);
        tracing::info!("   💾 Memory saved: {} KB ({} → {} bytes)", 
                 (total_string_bytes.saturating_sub(symbols_bytes)) / 1024,
                 total_string_bytes, 
                 symbols_bytes);
        tracing::info!("   🔗 Interned strings: {:?}", self.path_interner.memory_stats());
        
        Ok(nodes)
    }
    
    /// Get icon ID with caching (VS Code style)
    fn get_cached_icon_id(&mut self, extension: Option<&str>, is_directory: bool) -> String {
        if is_directory {
            return "folder".to_string();
        }
        
        let key = extension.unwrap_or("").to_string();
        
        if let Some(cached) = self.icon_cache.get(&key) {
            return cached.clone();
        }
        
        let icon_id = match extension {
            Some("rs") => "rust",
            Some("ts") => "typescript", 
            Some("tsx") => "tsx",
            Some("js") => "javascript",
            Some("jsx") => "jsx",
            Some("py") => "python",
            Some("json") => "json",
            Some("md") => "markdown",
            Some("html") => "html",
            Some("css") => "css",
            Some("toml") => "config",
            Some("yaml") | Some("yml") => "yaml",
            _ => "file",
        }.to_string();
        
        self.icon_cache.insert(key, icon_id.clone());
        icon_id
    }
    
    /// Get performance metrics
    pub fn get_performance_metrics(&self) -> (u64, u64, u64, (usize, usize)) {
        (
            self.scan_count,
            self.total_nodes, 
            self.memory_saved_bytes,
            self.path_interner.memory_stats()
        )
    }
    
    /// Get file size in human-readable format
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
    pub fn is_safe_to_open(&self, _file_path: &str, size: u64) -> (bool, Option<String>) {
        const MAX_SAFE_SIZE: u64 = 64 * 1024 * 1024; // 64MB
        const LARGE_FILE_WARNING: u64 = 1024 * 1024; // 1MB
        
        if size > MAX_SAFE_SIZE {
            return (false, Some(format!("File too large ({}) to open safely", Self::format_file_size(size))));
        }
        
        if size > LARGE_FILE_WARNING {
            return (true, Some(format!("Large file ({}). Some features may be slower", Self::format_file_size(size))));
        }
        
        (true, None)
    }
} 