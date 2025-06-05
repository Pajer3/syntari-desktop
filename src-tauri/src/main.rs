// Syntari AI IDE - Desktop Application Entry Point
// High-performance Tauri + Rust backend for AI router IDE

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// PERFORMANCE: VS Code-style allocator (30-40% performance improvement)
#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

use syntari_desktop_lib::{
    core, filesystem, project, ai, chat
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(core::state::AppState::default())
        .setup(|app| {
            // Initialize the robust file system watcher
            filesystem::watcher::initialize_watcher(app.handle().clone());
            println!("🎮 [RUST] Syntari Desktop App initialized with robust file watcher");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Core application commands
            core::commands::initialize_app,
            
            // Project management commands  
            project::commands::open_project,
            
            // AI provider commands
            ai::commands::get_ai_providers,
            ai::commands::generate_ai_response,
            ai::context7::commands::resolve_library_id,
            ai::context7::commands::get_library_docs,
            
            // Chat commands
            chat::commands::create_chat_session,
            chat::commands::send_chat_message,
            chat::commands::get_chat_session,
            
            // VS Code-style filesystem operations
            filesystem::commands::read_file,
            filesystem::commands::read_file_smart,
            filesystem::commands::save_file,
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
            
            // Backup directory management (VS Code style)
            filesystem::commands::create_dir_all,
            filesystem::commands::list_backup_files,
            filesystem::commands::delete_file,
            filesystem::commands::create_file,
            filesystem::commands::create_directory,
            
            // Live file system watcher (VS Code style)
            filesystem::watcher::start_file_watcher,
            filesystem::watcher::stop_file_watcher,
            filesystem::watcher::get_file_watcher_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
