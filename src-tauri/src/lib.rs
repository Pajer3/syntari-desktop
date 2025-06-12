// Syntari AI IDE - Tauri Backend (Modular Architecture)
// Enterprise-grade AI router with clean domain separation

#[cfg(debug_assertions)]
use tauri::Manager;

// ================================
// MODULE DECLARATIONS
// ================================

pub mod core;
pub mod ai;
pub mod filesystem; 
pub mod chat;
pub mod project;
pub mod terminal;

// Re-export main types for convenience
pub use core::{AppState, TauriResult};

// ================================
// LIBRARY SETUP FUNCTIONS
// ================================

/// Initialize file system watcher for the application
pub fn initialize_file_watcher(app_handle: tauri::AppHandle) {
    filesystem::watcher::initialize_watcher(app_handle.clone());
    tracing::info!("🎮 [RUST] Syntari Desktop App initialized with robust file watcher");
}

/// Setup function for development tools (debug builds only)
#[cfg(debug_assertions)]
pub fn setup_debug_tools(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    tracing::info!("Syntari AI IDE starting up in debug mode...");
    
    // Always enable devtools for debugging
    if let Some(window) = app.get_webview_window("main") {
        // Enable developer tools
        window.open_devtools();
        tracing::info!("Developer tools opened automatically for window: {}", window.label());
        
        // Log window configuration
        tracing::info!("Window devtools enabled for debugging");
    }
    
    Ok(())
}

/// Setup function for production builds
#[cfg(not(debug_assertions))]
pub fn setup_production(_app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    tracing::info!("Syntari AI IDE starting up in production mode...");
    Ok(())
}

