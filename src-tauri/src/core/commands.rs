// Syntari AI IDE - Core Commands
// Core application commands exposed to the frontend

use tauri::State;
use crate::core::{AppState, TauriResult, Result};
use crate::ai::types::AiProvider;

// ================================
// CORE APPLICATION COMMANDS
// ================================

#[tauri::command]
pub async fn initialize_app(state: State<'_, AppState>) -> std::result::Result<TauriResult<String>, String> {
    tracing::info!("Initializing Syntari AI IDE...");
    
    match state.initialize().await {
        Ok(_) => {
            tracing::info!("Syntari AI IDE initialized successfully");
            Ok(TauriResult::success("Application initialized successfully".to_string()))
        }
        Err(e) => {
            tracing::error!("Failed to initialize application: {:?}", e);
            Ok(TauriResult::error(e.to_string()))
        }
    }
}

#[tauri::command]
pub async fn get_ai_providers(state: State<'_, AppState>) -> std::result::Result<TauriResult<Vec<AiProvider>>, String> {
    tracing::info!("Getting AI providers list...");
    
    match state.get_all_ai_providers().await {
        Ok(providers) => {
            tracing::info!("Retrieved {} AI providers", providers.len());
            Ok(TauriResult::success(providers))
        }
        Err(e) => {
            tracing::error!("Failed to get AI providers: {:?}", e);
            Ok(TauriResult::error(e.to_string()))
        }
    }
}

#[tauri::command]
pub async fn get_app_stats(state: State<'_, AppState>) -> std::result::Result<TauriResult<std::collections::HashMap<String, serde_json::Value>>, String> {
    match get_stats_internal(&state).await {
        Ok(stats) => Ok(TauriResult::success(stats)),
        Err(e) => {
            tracing::error!("Failed to get app stats: {:?}", e);
            Ok(TauriResult::error(e.to_string()))
        }
    }
}

#[tauri::command]
pub async fn get_user_preferences(state: State<'_, AppState>) -> std::result::Result<TauriResult<std::collections::HashMap<String, serde_json::Value>>, String> {
    let preferences = state.get_all_preferences().await;
    Ok(TauriResult::success(preferences))
}

#[tauri::command]
pub async fn set_user_preference(
    state: State<'_, AppState>,
    key: String,
    value: serde_json::Value
) -> std::result::Result<TauriResult<String>, String> {
    match state.set_preference(&key, value).await {
        Ok(_) => Ok(TauriResult::success(format!("Preference '{}' updated successfully", key))),
        Err(e) => {
            tracing::error!("Failed to set preference '{}': {:?}", key, e);
            Ok(TauriResult::error(e.to_string()))
        }
    }
}

// ================================
// FILE OPERATION COMMANDS
// ================================

#[tauri::command]
pub async fn read_file_smart(path: String) -> std::result::Result<TauriResult<crate::filesystem::commands::file_ops::FileReadResult>, String> {
    crate::filesystem::commands::file_ops::read_file_smart_impl(path).await
}

#[tauri::command]
pub async fn save_file(path: String, content: String) -> std::result::Result<TauriResult<String>, String> {
    crate::filesystem::commands::file_ops::save_file_impl(path, content).await
}

#[tauri::command]
pub async fn create_file(path: String, content: Option<String>) -> std::result::Result<String, String> {
    crate::filesystem::commands::file_ops::create_file_impl(path, content).await
}

// ================================
// INTERNAL HELPER FUNCTIONS
// ================================

async fn get_stats_internal(state: &State<'_, AppState>) -> Result<std::collections::HashMap<String, serde_json::Value>> {
    let stats = state.get_stats().await;
    tracing::debug!("Application stats: {:?}", stats);
    Ok(stats)
} 