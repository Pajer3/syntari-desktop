// Syntari AI IDE - Core Application Commands
// Core business logic and application state management only

use tauri::State;
use crate::core::{AppState, AppResult, TauriResult};
use crate::ai::types::AiProvider;

// ================================
// CORE APPLICATION COMMANDS
// ================================

#[tauri::command]
pub async fn initialize_app(state: State<'_, AppState>) -> std::result::Result<TauriResult<String>, String> {
    match state.initialize().await {
        Ok(_) => {
            tracing::info!("✅ Application initialized successfully");
            Ok(TauriResult::success("Application initialized successfully".to_string()))
        }
        Err(e) => {
            tracing::error!("❌ Failed to initialize application: {:?}", e);
            Ok(TauriResult::error(e.to_string()))
        }
    }
}

#[tauri::command]
pub async fn get_ai_providers(state: State<'_, AppState>) -> std::result::Result<TauriResult<Vec<AiProvider>>, String> {
    match state.get_all_ai_providers().await {
        Ok(providers) => {
            tracing::debug!("Retrieved {} AI providers", providers.len());
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
// INTERNAL HELPER FUNCTIONS
// ================================

async fn get_stats_internal(state: &State<'_, AppState>) -> AppResult<std::collections::HashMap<String, serde_json::Value>> {
    let stats = state.get_stats().await;
    tracing::debug!("Application stats: {:?}", stats);
    Ok(stats)
} 