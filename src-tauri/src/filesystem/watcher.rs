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

// Global file cache to track known files for better event detection
lazy_static! {
    static ref KNOWN_FILES: Arc<Mutex<HashMap<String, u64>>> = Arc::new(Mutex::new(HashMap::new()));
}

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
        Self {
            app_handle,
            watchers: Arc::new(Mutex::new(HashMap::new())),
            watched_paths: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn start_watching<P: AsRef<Path>>(&self, path: P) -> Result<String, String> {
        let path = path.as_ref();
        let path_str = path.to_string_lossy();
        
        // Emergency filter for system directories that cause log spam
        if Self::is_problematic_directory(path) {
            // Return success but don't actually watch - prevents log spam
            return Ok(path_str.to_string());
        }
        
        // Check if already watching this path
        {
            let watched_paths = self.watched_paths.lock().unwrap();
            if watched_paths.contains_key(&path_str.to_string()) {
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
                self.start_full_watching(&path, &path_str).await
            }
            WatchStrategy::Selective(patterns) => {
                self.start_selective_watching(&path, &path_str, patterns).await
            }
            WatchStrategy::Hybrid => {
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
        // Pre-populate file cache for better event detection
        self.populate_file_cache(canonical_path).await;

        let app_handle = self.app_handle.clone();
        let root_path = canonical_path.to_path_buf();
        
        let mut debouncer = new_debouncer(
            Duration::from_millis(100),
            move |result: DebounceEventResult| {
                Self::handle_debounced_events(result, &app_handle, &root_path);
            }
        ).map_err(|e| format!("Failed to create debouncer: {}", e))?;

        debouncer.watcher()
            .watch(canonical_path, RecursiveMode::Recursive)
            .map_err(|e| self.format_watch_error(e))?;

        // Store the debouncer
        self.store_watcher(watcher_id.to_string(), canonical_path.to_path_buf(), debouncer);

        Ok(watcher_id.to_string())
    }

    // Pre-populate the file cache with existing files
    async fn populate_file_cache(&self, root_path: &Path) {
        let mut known_files = KNOWN_FILES.lock().unwrap();
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        if let Err(e) = self.scan_directory_for_cache(root_path, &mut known_files, timestamp, 0) {
            eprintln!("Failed to populate file cache: {}", e);
        }
    }
    
    fn scan_directory_for_cache(
        &self, 
        dir_path: &Path, 
        known_files: &mut HashMap<String, u64>, 
        timestamp: u64,
        depth: usize
    ) -> Result<(), String> {
        // Prevent infinite recursion and excessive memory usage
        if depth > 10 || known_files.len() > 10000 {
            return Ok(());
        }

        if let Ok(entries) = std::fs::read_dir(dir_path) {
            for entry in entries.take(1000) { // Limit entries per directory
                if let Ok(entry) = entry {
                    let path = entry.path();
                    let path_str = path.to_string_lossy().to_string();
                    
                    // Skip problematic directories
                    if Self::should_ignore_path(&path) {
                        continue;
                    }
                    
                    if path.is_file() {
                        known_files.insert(path_str, timestamp);
                    } else if path.is_dir() && depth < 5 { // Limit recursion depth
                        // Recursively scan subdirectories (with depth limit)
                        let _ = self.scan_directory_for_cache(&path, known_files, timestamp, depth + 1);
                    }
                }
            }
        }

        Ok(())
    }

    async fn start_selective_watching(&self, canonical_path: &Path, watcher_id: &str, _patterns: Vec<String>) -> Result<String, String> {
        let app_handle = self.app_handle.clone();
        let path_for_events = canonical_path.to_path_buf();
        
        let mut debouncer = new_debouncer(
            Duration::from_millis(100),
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
                    eprintln!("Could not watch {}: {}", dir_path.display(), e);
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
            Duration::from_millis(100),
            move |result: DebounceEventResult| {
                Self::handle_debounced_events(result, &app_handle, &path_for_events);
            }
        ).map_err(|e| format!("Failed to create debouncer: {}", e))?;

        // Watch only the root directory (non-recursive) for hybrid approach
        debouncer.watcher()
            .watch(&canonical_path, RecursiveMode::NonRecursive)
            .map_err(|e| self.format_watch_error(e))?;

        self.store_watcher(watcher_id.to_string(), canonical_path.to_path_buf(), debouncer);
        Ok(watcher_id.to_string())
    }

    fn store_watcher(&self, watcher_id: String, path: PathBuf, debouncer: notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>) {
        let mut watchers = self.watchers.lock().unwrap();
        let mut watched_paths = self.watched_paths.lock().unwrap();
        
        watchers.insert(watcher_id.clone(), Box::new(debouncer));
        watched_paths.insert(watcher_id, path);
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
        match result {
            Ok(events) => {
                let event_count = events.len();
                
                // For large projects, throttle logging to prevent spam
                if event_count > 10 {
                    // Process events but don't log each one
                } else {
                    // Process and optionally log smaller batches
                }
                
                for event in events {
                    if let Some(fs_event) = Self::convert_debounced_event(event, root_path, app_handle) {
                        Self::emit_event(app_handle, fs_event);
                    }
                }
            }
            Err(errors) => {
                eprintln!("File watcher errors: {:?}", errors);
            }
        }
    }

    fn convert_debounced_event(event: DebouncedEvent, _root_path: &Path, app_handle: &AppHandle) -> Option<FileSystemEvent> {
        let path = event.path.to_string_lossy().to_string();
        let is_directory = event.path.is_dir();
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Skip temporary files and system files that cause noise
        if Self::should_ignore_path(&event.path) {
            return None;
        }

        // DebouncedEventKind only has Any and AnyContinuous variants
        // We need to determine the actual event type from the file system state
        let event_type = if event.path.exists() {
            // File exists, so it was either created or modified
            if let Ok(mut known_files) = KNOWN_FILES.lock() {
                if known_files.contains_key(&path) {
                    "modified"
                } else {
                    known_files.insert(path.clone(), timestamp);
                    "created"
                }
            } else {
                "modified" // Default to modified if we can't check cache
            }
        } else {
            // File doesn't exist, so it was deleted
            if let Ok(mut known_files) = KNOWN_FILES.lock() {
                known_files.remove(&path);
            }
            "deleted"
        };

        // Emit special delete event for immediate UI updates
        if event_type == "deleted" {
            if let Err(e) = app_handle.emit("file-deleted", &path) {
                eprintln!("Failed to emit file-deleted event: {}", e);
            }
        }

        Some(FileSystemEvent {
            event_type: event_type.to_string(),
            path,
            is_directory,
            timestamp,
        })
    }

    fn emit_event(app_handle: &AppHandle, event: FileSystemEvent) {
        if let Err(e) = app_handle.emit("file-system-change", &event) {
            eprintln!("Failed to emit file system event: {}", e);
        }
    }

    pub async fn stop_watching(&self, watcher_id: &str) -> Result<(), String> {
        // Remove from watchers map
        {
            let mut watchers = self.watchers.lock().unwrap();
            watchers.remove(watcher_id);
        }

        // Remove from watched paths
        {
            let mut watched_paths = self.watched_paths.lock().unwrap();
            if let Some(path) = watched_paths.remove(watcher_id) {
                self.clear_cache_for_path(&path);
            }
        }

        Ok(())
    }
    
    fn clear_cache_for_path(&self, root_path: &Path) {
        let root_str = root_path.to_string_lossy();
        let mut known_files = KNOWN_FILES.lock().unwrap();
        let initial_count = known_files.len();
        
        // Remove all entries that start with this path
        known_files.retain(|path, _| !path.starts_with(&*root_str));
        
        let removed_count = initial_count - known_files.len();
        if removed_count > 0 {
            // Only log if significant cleanup occurred
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
        if let Err(_e) = self.app_handle.emit("project-watch-notification", &notification) {
            // Silently handle notification errors
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

    fn should_ignore_path(path: &Path) -> bool {
        let path_str = path.to_string_lossy();
        
        // Temporary files and system files that cause noise
        let ignore_patterns = [
            "__pycache__",
            ".pyc",
            "/.cache/",
            "/temp/",
            "/tmp/",
            ".syntari_permission_test",
            ".syntari"
        ];
        
        ignore_patterns.iter().any(|&pattern| path_str.contains(pattern))
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
    let watcher = {
        let global_watcher = GLOBAL_WATCHER.lock().unwrap();
        match global_watcher.as_ref() {
            Some(watcher) => watcher.clone(),
            None => return Err("File system watcher not initialized".to_string()),
        }
    };
    
    watcher.start_watching(&path).await
}

/// Stop watching a directory
#[tauri::command]
pub async fn stop_file_watcher(
    _app_handle: AppHandle,
    watcher_id: String,
) -> Result<String, String> {
    let watcher = {
        let global_watcher = GLOBAL_WATCHER.lock().unwrap();
        match global_watcher.as_ref() {
            Some(watcher) => watcher.clone(),
            None => return Err("File system watcher not initialized".to_string()),
        }
    };
    
    watcher.stop_watching(&watcher_id).await
        .map_err(|e| e.to_string())?;
    Ok("Stopped".to_string())
}

/// Get file watcher statistics
#[tauri::command]
pub async fn get_file_watcher_stats(
    _app_handle: AppHandle,
) -> Result<(usize, usize), String> {
    let stats = get_watcher_statistics();
    Ok(stats)
}

#[derive(Debug)]
enum WatchStrategy {
    Full,                           // Small projects: watch everything
    Selective(Vec<String>),         // Medium projects: watch important patterns
    Hybrid,                         // Large projects: watch + periodic scan
} 