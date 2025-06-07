// Syntari AI IDE - Dialog Commands
// File and folder selection dialogs

use crate::core::types::TauriResult;

/// Open folder dialog (handled by frontend)
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