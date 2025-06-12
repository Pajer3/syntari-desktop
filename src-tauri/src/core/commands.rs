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
pub async fn write_file(path: String, content: String) -> std::result::Result<TauriResult<String>, String> {
    // Frontend calls: invoke('write_file', { path: filePath, content: content })
    // This is essentially identical to save_file - providing alias for compatibility
    crate::filesystem::commands::file_ops::save_file_impl(path, content).await
}

#[tauri::command]
pub async fn create_file(path: String, content: Option<String>) -> std::result::Result<String, String> {
    crate::filesystem::commands::file_ops::create_file_impl(path, content).await
}

#[tauri::command]
pub async fn copy_file(source_path: String, target_path: String) -> std::result::Result<TauriResult<String>, String> {
    use std::fs;
    use std::path::Path;
    
    tracing::info!("Copying file from '{}' to '{}'", source_path, target_path);
    
    let source = Path::new(&source_path);
    let target = Path::new(&target_path);
    
    if !source.exists() {
        return Ok(TauriResult::error(format!("Source file does not exist: {}", source_path)));
    }
    
    if target.exists() {
        return Ok(TauriResult::error(format!("Target file already exists: {}", target_path)));
    }
    
    // Create parent directories if they don't exist
    if let Some(parent) = target.parent() {
        if !parent.exists() {
            match fs::create_dir_all(parent) {
                Ok(_) => tracing::debug!("Created parent directories for: {}", target_path),
                Err(e) => {
                    tracing::error!("Failed to create parent directories: {}", e);
                    return Ok(TauriResult::error(format!("Failed to create parent directories: {}", e)));
                }
            }
        }
    }
    
    // Copy file or directory
    if source.is_dir() {
        match copy_dir_recursive(source, target) {
            Ok(_) => {
                tracing::info!("Directory copied successfully from '{}' to '{}'", source_path, target_path);
                Ok(TauriResult::success(format!("Directory copied to {}", target_path)))
            }
            Err(e) => {
                tracing::error!("Failed to copy directory: {}", e);
                Ok(TauriResult::error(format!("Failed to copy directory: {}", e)))
            }
        }
    } else {
        match fs::copy(source, target) {
            Ok(_) => {
                tracing::info!("File copied successfully from '{}' to '{}'", source_path, target_path);
                Ok(TauriResult::success(format!("File copied to {}", target_path)))
            }
            Err(e) => {
                tracing::error!("Failed to copy file: {}", e);
                Ok(TauriResult::error(format!("Failed to copy file: {}", e)))
            }
        }
    }
}

#[tauri::command]
pub async fn move_file(source_path: String, target_path: String) -> std::result::Result<TauriResult<String>, String> {
    use std::fs;
    use std::path::Path;
    
    tracing::info!("Moving file from '{}' to '{}'", source_path, target_path);
    
    let source = Path::new(&source_path);
    let target = Path::new(&target_path);
    
    if !source.exists() {
        return Ok(TauriResult::error(format!("Source file does not exist: {}", source_path)));
    }
    
    if target.exists() {
        return Ok(TauriResult::error(format!("Target file already exists: {}", target_path)));
    }
    
    // Create parent directories if they don't exist
    if let Some(parent) = target.parent() {
        if !parent.exists() {
            match fs::create_dir_all(parent) {
                Ok(_) => tracing::debug!("Created parent directories for: {}", target_path),
                Err(e) => {
                    tracing::error!("Failed to create parent directories: {}", e);
                    return Ok(TauriResult::error(format!("Failed to create parent directories: {}", e)));
                }
            }
        }
    }
    
    // Move file or directory
    match fs::rename(source, target) {
        Ok(_) => {
            tracing::info!("File moved successfully from '{}' to '{}'", source_path, target_path);
            Ok(TauriResult::success(format!("File moved to {}", target_path)))
        }
        Err(e) => {
            tracing::error!("Failed to move file: {}", e);
            Ok(TauriResult::error(format!("Failed to move file: {}", e)))
        }
    }
}

// ================================
// INTERNAL HELPER FUNCTIONS
// ================================

async fn get_stats_internal(state: &State<'_, AppState>) -> Result<std::collections::HashMap<String, serde_json::Value>> {
    let stats = state.get_stats().await;
    tracing::debug!("Application stats: {:?}", stats);
    Ok(stats)
}

fn copy_dir_recursive(source: &std::path::Path, target: &std::path::Path) -> std::io::Result<()> {
    use std::fs;
    
    if !source.is_dir() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Source is not a directory",
        ));
    }
    
    if !target.exists() {
        fs::create_dir_all(target)?;
    }
    
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let entry_path = entry.path();
        let target_path = target.join(entry.file_name());
        
        if entry_path.is_dir() {
            copy_dir_recursive(&entry_path, &target_path)?;
        } else {
            fs::copy(&entry_path, &target_path)?;
        }
    }
    
    Ok(())
} 