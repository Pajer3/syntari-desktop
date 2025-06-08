// Syntari AI IDE - Tauri Backend (Modular Architecture)
// Enterprise-grade AI router with clean domain separation

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
// APPLICATION ENTRY POINT
// ================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Setup logic and developer tools for debug builds
            tracing::info!("Syntari AI IDE starting up...");
            
            // Initialize the robust file system watcher
            filesystem::watcher::initialize_watcher(app.handle().clone());
            tracing::info!("🎮 [RUST] Syntari Desktop App initialized with robust file watcher");
            
            // Always enable devtools for debugging
            if let Some(window) = app.get_webview_window("main") {
                // Enable developer tools
                window.open_devtools();
                tracing::info!("Developer tools opened automatically for window: {}", window.label());
                
                // Log window configuration
                tracing::info!("Window devtools enabled for debugging");
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Core application commands
            core::commands::initialize_app,
            core::commands::get_ai_providers,
            core::commands::get_app_stats,
            core::commands::get_user_preferences,
            core::commands::set_user_preference,
            core::commands::read_file_smart,
            core::commands::save_file,
            core::commands::create_file,
            
            // Project management commands  
            project::commands::open_project,
            
            // AI provider commands (removing duplicate get_ai_providers)
            ai::commands::generate_ai_response,
            ai::context7::commands::resolve_library_id,
            ai::context7::commands::get_library_docs,
            
            // Chat commands
            chat::commands::create_chat_session,
            chat::commands::send_chat_message,
            chat::commands::get_chat_session,
            
            // VS Code-style filesystem operations (removing duplicates)
            filesystem::commands::read_file,
            filesystem::commands::get_directory_mtime,
            filesystem::commands::open_folder_dialog,
            filesystem::commands::check_folder_permissions,
            filesystem::commands::scan_directories_only,
            filesystem::commands::scan_files_chunked,
            filesystem::commands::scan_files_streaming,
            filesystem::commands::scan_everything_clean,
            filesystem::commands::load_folder_contents,
            filesystem::commands::load_root_items,
            filesystem::commands::debug_test_command,
            filesystem::commands::search_in_project,
            filesystem::commands::search_in_project_streaming,
            
            // File management commands (VS Code style) (removing duplicates)
            filesystem::commands::create_dir_all,
            filesystem::commands::delete_file,
            filesystem::commands::create_directory,
            
            // Live file system watcher (VS Code style)
            filesystem::watcher::start_file_watcher,
            filesystem::watcher::stop_file_watcher,
            filesystem::watcher::get_file_watcher_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

