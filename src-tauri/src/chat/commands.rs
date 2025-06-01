// Syntari AI IDE - Chat Commands
// Chat-related commands exposed to the frontend

use tauri::State;
use crate::core::{AppState, TauriResult, generate_id};
use crate::chat::types::{ChatMessage, ChatSession};
use crate::project::types::ProjectContext;

#[tauri::command]
pub async fn create_chat_session(
    project_path: String,
    state: State<'_, AppState>,
) -> std::result::Result<TauriResult<String>, String> {
    tracing::info!("Creating chat session for project: {}", project_path);
    
    // Get current project context or create a basic one
    let project_context = match state.get_current_project().await {
        Some(context) if context.root_path == project_path => context,
        _ => {
            // Create a minimal project context if none exists
            ProjectContext::new(project_path.clone(), "unknown".to_string())
        }
    };
    
    // Generate a unique session ID
    let session_id = generate_id();
    
    // Create the chat session
    let session_name = format!("Chat - {}", 
        std::path::Path::new(&project_path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("Project")
    );
    
    let chat_session = ChatSession::new(session_name, project_context);
    
    // Store the session in the application state
    {
        let mut sessions = state.chat_sessions.lock().await;
        sessions.insert(session_id.clone(), chat_session);
    }
    
    tracing::info!("Created chat session with ID: {}", session_id);
    Ok(TauriResult::success(session_id))
}

#[tauri::command]
pub async fn send_chat_message(
    session_id: String,
    content: String,
    state: State<'_, AppState>,
) -> std::result::Result<TauriResult<ChatMessage>, String> {
    tracing::info!("Sending message to session: {}", session_id);
    
    let user_message = ChatMessage::user_message(content);
    
    // Add message to session
    {
        let mut sessions = state.chat_sessions.lock().await;
        if let Some(session) = sessions.get_mut(&session_id) {
            session.add_message(user_message.clone());
            tracing::debug!("Added user message to session {}", session_id);
        } else {
            tracing::warn!("Session not found: {}", session_id);
            return Ok(TauriResult::error("Chat session not found".to_string()));
        }
    }
    
    // For now, return the user message (AI response would be implemented later)
    Ok(TauriResult::success(user_message))
}

#[tauri::command]
pub async fn get_chat_session(
    session_id: String,
    state: State<'_, AppState>,
) -> std::result::Result<TauriResult<ChatSession>, String> {
    tracing::debug!("Retrieving chat session: {}", session_id);
    
    let sessions = state.chat_sessions.lock().await;
    if let Some(session) = sessions.get(&session_id) {
        Ok(TauriResult::success(session.clone()))
    } else {
        tracing::warn!("Session not found: {}", session_id);
        Ok(TauriResult::error("Chat session not found".to_string()))
    }
} 