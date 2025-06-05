// Syntari AI IDE - Live File System Watcher
// VS Code-style live file explorer with instant updates

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
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
        let canonical_path = path.canonicalize()
            .map_err(|e| format!("Failed to canonicalize path: {}", e))?;
        
        let watcher_id = canonical_path.to_string_lossy().to_string();
        
        println!("🔍 [RUST] Starting to watch: {}", canonical_path.display());

        // Check if we're already watching this path
        {
            let watched_paths = self.watched_paths.lock().unwrap();
            if watched_paths.contains_key(&watcher_id) {
                println!("⚠️ [RUST] Already watching path: {}", canonical_path.display());
                return Ok(watcher_id);
            }
        }

        // Create the debounced watcher with production settings
        let app_handle = self.app_handle.clone();
        let path_for_events = canonical_path.clone();
        
        let mut debouncer = new_debouncer(
            Duration::from_millis(200), // 200ms debounce - VS Code uses similar timing
            move |result: DebounceEventResult| {
                Self::handle_debounced_events(result, &app_handle, &path_for_events);
            }
        ).map_err(|e| format!("Failed to create debouncer: {}", e))?;

        // Start watching with recursive mode
        debouncer.watcher()
            .watch(&canonical_path, RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to start watching: {}", e))?;

        println!("✅ [RUST] Successfully started watching: {}", canonical_path.display());

        // Store the watcher
        {
            let mut watchers = self.watchers.lock().unwrap();
            let mut watched_paths = self.watched_paths.lock().unwrap();
            
            watchers.insert(watcher_id.clone(), Box::new(debouncer));
            watched_paths.insert(watcher_id.clone(), canonical_path);
        }

        Ok(watcher_id)
    }

    fn handle_debounced_events(
        result: DebounceEventResult, 
        app_handle: &AppHandle, 
        root_path: &Path
    ) {
        match result {
            Ok(events) => {
                for event in events {
                    if let Some(fs_event) = Self::convert_debounced_event(event, root_path) {
                        Self::emit_event(app_handle, fs_event);
                    }
                }
            }
            Err(errors) => {
                println!("🚨 [RUST] File watcher error: {:?}", errors);
            }
        }
    }

    fn convert_debounced_event(event: DebouncedEvent, root_path: &Path) -> Option<FileSystemEvent> {
        let path = &event.path;
        
        // Skip if not under our watched root
        if !path.starts_with(root_path) {
            return None;
        }

        // Skip hidden files and common ignore patterns
        if let Some(file_name) = path.file_name() {
            let name = file_name.to_string_lossy();
            if name.starts_with('.') || 
               name == "node_modules" || 
               name.ends_with(".tmp") || 
               name.ends_with(".swp") ||
               name.ends_with("~") {
                return None;
            }
        }

        // Skip if path contains ignored directories
        for component in path.components() {
            if let Some(name) = component.as_os_str().to_str() {
                if name == "node_modules" || 
                   name == ".git" || 
                   name == ".vscode" ||
                   name == "target" ||
                   name == "dist" ||
                   name == "build" ||
                   name.starts_with(".") {
                    return None;
                }
            }
        }

        let path_str = path.to_string_lossy().to_string();
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        // Determine if it's a directory - use metadata if file exists, otherwise infer from event
        let is_directory = path.is_dir() || 
            (path.extension().is_none() && !path.is_file());

        let event_type = match event.kind {
            notify_debouncer_mini::DebouncedEventKind::Any => {
                // For "Any" events, try to determine the actual type
                if path.exists() {
                    if path.is_file() {
                        "modified"
                    } else {
                        "created" // Directory or new file
                    }
                } else {
                    "deleted"
                }
            },
            _ => "unknown", // Handle any other possible event types
        };

        println!("📥 [RUST] Processing file event: {} - {} (dir: {})", 
                event_type, path_str, is_directory);

        Some(FileSystemEvent {
            event_type: event_type.to_string(),
            path: path_str,
            is_directory,
            timestamp,
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