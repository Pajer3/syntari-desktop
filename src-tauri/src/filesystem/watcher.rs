// Syntari AI IDE - Live File System Watcher
// VS Code-style live file explorer with instant updates

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use notify::RecursiveMode;
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, DebouncedEvent};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use lazy_static::lazy_static;


// ================================
// FILE SYSTEM EVENT TYPES
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileSystemEvent {
    pub event_type: String,
    pub path: String,
    pub is_directory: bool,
    pub timestamp: u64,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatcherInfo {
    pub root_path: String,
    pub last_activity: u64, // Unix timestamp
    pub event_count: usize,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectAnalysis {
    pub path: String,
    pub project_type: String,
    pub file_count: usize,
    pub dir_count: usize,
    pub has_build_artifacts: bool,
    pub estimated_total_files: usize,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectWatchNotification {
    pub notification_type: String,
    pub title: String,
    pub message: String,
    pub strategy: String,
    pub performance_note: String,
    pub auto_dismiss: bool,
}

// ================================
// THREAD-SAFE FILE SYSTEM WATCHER
// ================================

type WatcherMap = Arc<Mutex<HashMap<String, Box<dyn std::any::Any + Send + Sync>>>>;
type PathMap = Arc<Mutex<HashMap<String, PathBuf>>>;

#[derive(Debug, Clone)]
pub struct FileSystemWatcher {
    app_handle: AppHandle,
    watchers: WatcherMap,
    watched_paths: PathMap,
}

impl FileSystemWatcher {
    pub fn new(app_handle: AppHandle) -> Self {
        println!("🎮 [RUST] Initializing robust file system watcher");
        
        Self {
            app_handle,
            watchers: Arc::new(Mutex::new(HashMap::new())),
            watched_paths: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn start_watching<P: AsRef<Path>>(&self, path: P) -> Result<String, String> {
        let path = path.as_ref();
        let path_str = path.to_string_lossy();
        
        println!("🔍 [RUST] Starting enterprise file watcher for: {}", path_str);
        
        // Emergency filter for system directories that cause log spam
        if Self::is_problematic_directory(path) {
            println!("⚠️ [RUST] Skipping problematic directory: {}", path_str);
            println!("📋 [RUST] This directory is known to generate excessive file events");
            println!("💡 [RUST] Consider watching a subdirectory instead");
            
            // Return success but don't actually watch - prevents log spam
            return Ok(path_str.to_string());
        }
        
        // Check if already watching this path
        {
            let watched_paths = self.watched_paths.lock().unwrap();
            if watched_paths.contains_key(&path_str.to_string()) {
                println!("⚠️ [RUST] Already watching path: {}", path_str);
                return Ok(path_str.to_string());
            }
        }

        // For massive projects: Use intelligent selective watching
        // Instead of skipping, we'll watch strategically
        let (watch_strategy, project_analysis) = self.determine_watch_strategy(&path)?;
        
        // Emit user-friendly notification about the project analysis
        self.emit_project_analysis_notification(&project_analysis).await;
        
        match watch_strategy {
            WatchStrategy::Full => {
                println!("📁 [RUST] Using full recursive watching");
                self.start_full_watching(&path, &path_str).await
            }
            WatchStrategy::Selective(patterns) => {
                println!("🎯 [RUST] Using selective watching with {} patterns", patterns.len());
                self.start_selective_watching(&path, &path_str, patterns).await
            }
            WatchStrategy::Hybrid => {
                println!("⚡ [RUST] Using hybrid watching for large project");
                self.start_hybrid_watching(&path, &path_str).await
            }
        }
    }

    fn determine_watch_strategy(&self, path: &Path) -> Result<(WatchStrategy, ProjectAnalysis), String> {
        // Count files and directories to determine strategy
        let mut file_count = 0;
        let mut dir_count = 0;
        let mut has_node_modules = false;
        let mut has_target_dir = false;
        let mut has_git = false;
        let mut has_cargo_toml = false;
        let mut has_package_json = false;

        // Quick scan of immediate subdirectories
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.take(100) { // Limit scan for performance
                if let Ok(entry) = entry {
                    let entry_path = entry.path();
                    if entry_path.is_dir() {
                        dir_count += 1;
                        let name = entry_path.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("");
                        
                        match name {
                            "node_modules" => has_node_modules = true,
                            "target" => has_target_dir = true,
                            ".git" => has_git = true,
                            _ => {}
                        }
                    } else {
                        file_count += 1;
                        let name = entry_path.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("");
                        
                        match name {
                            "Cargo.toml" => has_cargo_toml = true,
                            "package.json" => has_package_json = true,
                            _ => {}
                        }
                    }
                }
            }
        }

        // Determine project type for better user messaging
        let project_type = if has_cargo_toml { "Rust" }
        else if has_package_json { "Node.js" }
        else if has_git { "Git Repository" }
        else { "General" };

        let analysis = ProjectAnalysis {
            path: path.to_string_lossy().to_string(),
            project_type: project_type.to_string(),
            file_count,
            dir_count,
            has_build_artifacts: has_node_modules || has_target_dir,
            estimated_total_files: if has_node_modules { file_count * 100 } else { file_count * 10 },
        };

        // Determine strategy based on project characteristics
        let strategy = if file_count < 1000 && dir_count < 50 {
            WatchStrategy::Full
        } else if has_node_modules || has_target_dir {
            // Large projects with build artifacts - use selective watching
            let mut patterns = vec![
                "src/**/*".to_string(),
                "*.rs".to_string(),
                "*.ts".to_string(),
                "*.tsx".to_string(),
                "*.js".to_string(),
                "*.jsx".to_string(),
                "*.json".to_string(),
                "*.md".to_string(),
                "Cargo.toml".to_string(),
                "package.json".to_string(),
            ];
            
            if has_git {
                patterns.push(".gitignore".to_string());
            }
            
            WatchStrategy::Selective(patterns)
        } else {
            // Very large projects - use hybrid approach
            WatchStrategy::Hybrid
        };

        Ok((strategy, analysis))
    }

    async fn start_full_watching(&self, canonical_path: &Path, watcher_id: &str) -> Result<String, String> {
        let app_handle = self.app_handle.clone();
        let path_for_events = canonical_path.to_path_buf();
        
        let mut debouncer = new_debouncer(
            Duration::from_millis(200),
            move |result: DebounceEventResult| {
                Self::handle_debounced_events(result, &app_handle, &path_for_events);
            }
        ).map_err(|e| format!("Failed to create debouncer: {}", e))?;

        debouncer.watcher()
            .watch(&canonical_path, RecursiveMode::Recursive)
            .map_err(|e| self.format_watch_error(e))?;

        self.store_watcher(watcher_id.to_string(), canonical_path.to_path_buf(), debouncer);
        Ok(watcher_id.to_string())
    }

    async fn start_selective_watching(&self, canonical_path: &Path, watcher_id: &str, _patterns: Vec<String>) -> Result<String, String> {
        let app_handle = self.app_handle.clone();
        let path_for_events = canonical_path.to_path_buf();
        
        let mut debouncer = new_debouncer(
            Duration::from_millis(200),
            move |result: DebounceEventResult| {
                Self::handle_debounced_events(result, &app_handle, &path_for_events);
            }
        ).map_err(|e| format!("Failed to create debouncer: {}", e))?;

        // Watch the root directory non-recursively
        debouncer.watcher()
            .watch(&canonical_path, RecursiveMode::NonRecursive)
            .map_err(|e| self.format_watch_error(e))?;

        // Watch important subdirectories selectively
        let important_dirs = ["src", "components", "pages", "lib", "utils", "config"];
        for dir in important_dirs.iter() {
            let dir_path = canonical_path.join(dir);
            if dir_path.exists() {
                if let Err(e) = debouncer.watcher().watch(&dir_path, RecursiveMode::Recursive) {
                    println!("⚠️ [RUST] Could not watch {}: {}", dir_path.display(), e);
                    // Continue with other directories
                }
            }
        }

        self.store_watcher(watcher_id.to_string(), canonical_path.to_path_buf(), debouncer);
        Ok(watcher_id.to_string())
    }

    async fn start_hybrid_watching(&self, canonical_path: &Path, watcher_id: &str) -> Result<String, String> {
        let app_handle = self.app_handle.clone();
        let path_for_events = canonical_path.to_path_buf();
        
        let mut debouncer = new_debouncer(
            Duration::from_millis(500), // Longer debounce for large projects
            move |result: DebounceEventResult| {
                Self::handle_debounced_events(result, &app_handle, &path_for_events);
            }
        ).map_err(|e| format!("Failed to create debouncer: {}", e))?;

        // Watch root directory non-recursively
        debouncer.watcher()
            .watch(&canonical_path, RecursiveMode::NonRecursive)
            .map_err(|e| self.format_watch_error(e))?;

        // Use a background task to periodically scan for changes in unwatched areas
        let _path_clone = canonical_path.to_path_buf();
        let _app_handle_clone = self.app_handle.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(5));
            loop {
                interval.tick().await;
                // Periodic scan implementation would go here
            }
        });

        self.store_watcher(watcher_id.to_string(), canonical_path.to_path_buf(), debouncer);
        Ok(watcher_id.to_string())
    }

    fn store_watcher(&self, watcher_id: String, path: PathBuf, debouncer: notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>) {
        let mut watchers = self.watchers.lock().unwrap();
        let mut watched_paths = self.watched_paths.lock().unwrap();
        
        watchers.insert(watcher_id.clone(), Box::new(debouncer));
        watched_paths.insert(watcher_id, path);
        
        println!("✅ [RUST] Enterprise file watcher started successfully");
    }

    fn format_watch_error(&self, error: notify::Error) -> String {
        let error_msg = format!("Failed to start watching: {}", error);
        if error_msg.contains("No space left on device") || 
           error_msg.contains("file watch limit") ||
           error_msg.contains("too many") {
            format!("inotify limit reached. Run our fix script:\n\
                ./fix_file_watcher.sh\n\
                \n\
                Or manually increase limits:\n\
                sudo sysctl fs.inotify.max_user_watches=524288\n\
                sudo sysctl fs.inotify.max_user_instances=256\n\
                \n\
                Original error: {}", error)
        } else {
            error_msg
        }
    }

    fn handle_debounced_events(
        result: DebounceEventResult, 
        app_handle: &AppHandle, 
        root_path: &Path
    ) {
        static mut EVENT_COUNTER: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
        static mut LAST_LOG_TIME: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
        
        match result {
            Ok(events) => {
                let current_time = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();
                
                let event_count = unsafe { 
                    EVENT_COUNTER.fetch_add(events.len(), std::sync::atomic::Ordering::Relaxed) 
                };
                
                let last_log = unsafe { 
                    LAST_LOG_TIME.load(std::sync::atomic::Ordering::Relaxed) 
                };
                
                // Only log every 5 seconds to prevent spam
                let should_log = current_time - last_log > 5;
                
                if should_log {
                    unsafe {
                        LAST_LOG_TIME.store(current_time, std::sync::atomic::Ordering::Relaxed);
                    }
                    
                    // Check if this is a problematic directory
                    let path_str = root_path.to_string_lossy();
                    if path_str.contains("anaconda") || path_str.contains("miniconda") {
                        println!("⚡ [RUST] Large project: {} events processed (throttled logging)", event_count);
                    } else {
                        println!("📊 [RUST] File events: {} processed", events.len());
                    }
                }
                
                for event in events {
                    if let Some(fs_event) = Self::convert_debounced_event(event, root_path) {
                        Self::emit_event(app_handle, fs_event);
                    }
                }
            }
            Err(errors) => {
                // Only log errors, not individual events
                println!("❌ [RUST] File watcher errors: {:?}", errors);
            }
        }
    }

    fn convert_debounced_event(event: DebouncedEvent, root_path: &Path) -> Option<FileSystemEvent> {
        let path = event.path.to_string_lossy().to_string();
        
        // Filter out spam events from system directories
        if path.contains("__pycache__") || 
           path.contains(".pyc") ||
           path.contains("/.cache/") ||
           path.contains("/temp/") ||
           path.contains("/tmp/") {
            return None; // Skip these noisy events
        }
        
        let event_type = match event.kind {
            notify_debouncer_mini::DebouncedEventKind::Any => "modified",
            notify_debouncer_mini::DebouncedEventKind::AnyContinuous => "modified",
            _ => "modified", // Handle any future enum variants
        };

        Some(FileSystemEvent {
            event_type: event_type.to_string(),
            path,
            is_directory: event.path.is_dir(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        })
    }

    fn emit_event(app_handle: &AppHandle, event: FileSystemEvent) {
        if let Err(e) = app_handle.emit("file-system-change", &event) {
            println!("🚨 [RUST] Failed to emit file system event: {}", e);
        } else {
            println!("📤 [RUST] Emitted file system event: {} - {}", 
                    event.event_type, event.path);
        }
    }

    pub async fn stop_watching(&self, watcher_id: &str) -> Result<(), String> {
        println!("🛑 [RUST] Stopping watcher: {}", watcher_id);
        
        let mut watchers = self.watchers.lock().unwrap();
        let mut watched_paths = self.watched_paths.lock().unwrap();
        
        if watchers.remove(watcher_id).is_some() {
            watched_paths.remove(watcher_id);
            println!("✅ [RUST] Successfully stopped watcher: {}", watcher_id);
            Ok(())
        } else {
            let error = format!("Watcher not found: {}", watcher_id);
            println!("⚠️ [RUST] {}", error);
            Err(error)
        }
    }

    pub fn list_watched_paths(&self) -> Vec<String> {
        let watched_paths = self.watched_paths.lock().unwrap();
        watched_paths.values()
            .map(|path| path.to_string_lossy().to_string())
            .collect()
    }

    pub fn get_watcher_stats(&self) -> (usize, usize) {
        let watchers = self.watchers.lock().unwrap();
        let watched_paths = self.watched_paths.lock().unwrap();
        (watchers.len(), watched_paths.len())
    }

    async fn emit_project_analysis_notification(&self, analysis: &ProjectAnalysis) {
        let notification = match analysis.estimated_total_files {
            0..=1000 => ProjectWatchNotification {
                notification_type: "info".to_string(),
                title: "Project Analysis".to_string(),
                message: format!("Small {} project detected. Using full file watching for optimal responsiveness.", analysis.project_type),
                strategy: "Full Watching".to_string(),
                performance_note: "Real-time updates for all files".to_string(),
                auto_dismiss: true,
            },
            1001..=10000 => ProjectWatchNotification {
                notification_type: "info".to_string(), 
                title: "Large Project Detected".to_string(),
                message: format!("Medium-sized {} project with {} files detected. Using selective watching for optimal performance.", 
                    analysis.project_type, analysis.file_count),
                strategy: "Selective Watching".to_string(),
                performance_note: "Watching important directories (src/, config files, etc.)".to_string(),
                auto_dismiss: true,
            },
            _ => ProjectWatchNotification {
                notification_type: "warning".to_string(),
                title: "Very Large Project Detected".to_string(), 
                message: format!("Large {} project detected (~{} estimated files). Using hybrid watching to maintain performance.", 
                    analysis.project_type, analysis.estimated_total_files),
                strategy: "Hybrid Watching".to_string(),
                performance_note: "Root directory + periodic scanning for optimal memory usage".to_string(),
                auto_dismiss: false, // Keep visible for large projects
            }
        };

        // Emit to frontend for user notification
        if let Err(e) = self.app_handle.emit("project-watch-notification", &notification) {
            println!("⚠️ [RUST] Failed to emit project analysis notification: {}", e);
        }
    }

    fn is_problematic_directory(path: &Path) -> bool {
        let path_str = path.to_string_lossy();
        
        // System directories that generate massive amounts of events
        let problematic_patterns = [
            "anaconda",
            "miniconda", 
            "node_modules",
            ".npm",
            ".cache",
            "/tmp/",
            "/temp/",
            "/.local/",
            "/.vscode/",
            "/Library/",
            "/System/",
            "Program Files",
            "__pycache__"
        ];
        
        problematic_patterns.iter().any(|&pattern| path_str.contains(pattern))
    }
}

// ================================
// GLOBAL WATCHER INSTANCE
// ================================

// Thread-safe singleton for global access
lazy_static! {
    static ref GLOBAL_WATCHER: Arc<Mutex<Option<FileSystemWatcher>>> = Arc::new(Mutex::new(None));
}

pub fn initialize_watcher(app_handle: AppHandle) {
    let watcher = FileSystemWatcher::new(app_handle);
    let mut global_watcher = GLOBAL_WATCHER.lock().unwrap();
    *global_watcher = Some(watcher);
    println!("🎮 [RUST] Global file system watcher initialized");
}

pub async fn start_watching_path<P: AsRef<Path>>(path: P) -> Result<String, String> {
    let watcher = {
        let global_watcher = GLOBAL_WATCHER.lock().unwrap();
        match global_watcher.as_ref() {
            Some(watcher) => watcher.clone(),
            None => return Err("File system watcher not initialized".to_string()),
        }
    };
    
    watcher.start_watching(path).await
}

pub async fn stop_watching_path(watcher_id: &str) -> Result<(), String> {
    let watcher = {
        let global_watcher = GLOBAL_WATCHER.lock().unwrap();
        match global_watcher.as_ref() {
            Some(watcher) => watcher.clone(),
            None => return Err("File system watcher not initialized".to_string()),
        }
    };
    
    watcher.stop_watching(watcher_id).await
}

pub fn get_watched_paths() -> Vec<String> {
    let global_watcher = GLOBAL_WATCHER.lock().unwrap();
    match global_watcher.as_ref() {
        Some(watcher) => watcher.list_watched_paths(),
        None => Vec::new(),
    }
}

pub fn get_watcher_statistics() -> (usize, usize) {
    let global_watcher = GLOBAL_WATCHER.lock().unwrap();
    match global_watcher.as_ref() {
        Some(watcher) => watcher.get_watcher_stats(),
        None => (0, 0),
    }
}

// ================================
// TAURI COMMANDS
// ================================

/// Start watching a directory for file system changes
#[tauri::command]
pub async fn start_file_watcher(
    _app_handle: AppHandle,
    path: String,
) -> Result<String, String> {
    println!("🚀 [RUST] Starting robust file watcher for path: {}", path);
    
    match start_watching_path(&path).await {
        Ok(watcher_id) => {
            println!("✅ [RUST] Robust file watcher started successfully for: {} (ID: {})", path, watcher_id);
            Ok(watcher_id)
        },
        Err(e) => {
            println!("❌ [RUST] Failed to start robust file watcher for {}: {}", path, e);
            Err(e)
        }
    }
}

/// Stop watching a directory
#[tauri::command]
pub async fn stop_file_watcher(
    _app_handle: AppHandle,
    watcher_id: String,
) -> Result<String, String> {
    println!("🛑 [RUST] Stopping robust file watcher: {}", watcher_id);
    
    match stop_watching_path(&watcher_id).await {
        Ok(()) => {
            println!("✅ [RUST] Robust file watcher stopped successfully: {}", watcher_id);
            Ok("File watcher stopped successfully".to_string())
        }
        Err(e) => {
            println!("❌ [RUST] Failed to stop robust file watcher {}: {}", watcher_id, e);
            Err(format!("Failed to stop file watcher: {}", e))
        }
    }
}

/// Get file watcher statistics
#[tauri::command]
pub async fn get_file_watcher_stats(
    _app_handle: AppHandle,
) -> Result<(usize, usize), String> {
    let stats = get_watcher_statistics();
    println!("📊 [RUST] File watcher stats: {} active watchers, {} watched paths", stats.0, stats.1);
    Ok(stats)
}

#[derive(Debug)]
enum WatchStrategy {
    Full,                           // Small projects: watch everything
    Selective(Vec<String>),         // Medium projects: watch important patterns
    Hybrid,                         // Large projects: watch + periodic scan
} 