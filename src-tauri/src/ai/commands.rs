// Syntari AI IDE - AI Commands
// AI-related commands exposed to the frontend

use tauri::State;
use crate::core::{AppState, TauriResult};
use crate::ai::types::{AiProvider, AiRequest, ConsensusResult};

// ================================
// AI PROVIDER COMMANDS
// ================================

#[tauri::command]
pub async fn get_ai_providers(state: State<'_, AppState>) -> std::result::Result<TauriResult<Vec<AiProvider>>, String> {
    let providers = state.get_ai_providers().await;
    Ok(TauriResult::success(providers))
}

#[tauri::command]
pub async fn generate_ai_response(
    request: AiRequest,
    _state: State<'_, AppState>,
) -> std::result::Result<TauriResult<ConsensusResult>, String> {
    // Simplified implementation for now
    tracing::info!("Generating AI response for request: {}", request.id);
    
    // This will be implemented properly in the service layer
    Ok(TauriResult::error("AI response generation not yet implemented".to_string()))
} 