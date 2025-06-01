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
            
            #[cfg(debug_assertions)] // Only enable devtools in debug builds
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                    tracing::info!("Developer tools opened automatically for window: {}", window.label());
                }
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            core::commands::initialize_app,
            ai::commands::get_ai_providers,
            ai::commands::generate_ai_response,
            project::commands::open_project,
            chat::commands::create_chat_session,
            chat::commands::send_chat_message,
            chat::commands::get_chat_session,
            filesystem::commands::read_file,
            filesystem::commands::save_file,
            filesystem::commands::open_folder_dialog,
            filesystem::commands::check_folder_permissions,
            ai::context7::commands::resolve_library_id,
            ai::context7::commands::get_library_docs,
            filesystem::commands::get_directory_mtime,
            filesystem::commands::scan_directories_only,
            filesystem::commands::scan_files_chunked,
            filesystem::commands::scan_files_streaming,
            filesystem::commands::scan_everything_clean,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

