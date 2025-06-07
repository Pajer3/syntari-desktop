// Syntari AI IDE - Application State
// Centralized state management with domain separation

use std::collections::HashMap;
use tokio::sync::Mutex;
use crate::core::{Result, SyntariError};
use crate::ai::types::AiProvider;
use crate::chat::types::ChatSession;
use crate::project::types::ProjectContext;

// ================================
// APPLICATION STATE
// ================================

#[derive(Debug, Default)]
pub struct AppState {
    pub current_project: Mutex<Option<ProjectContext>>,
    pub chat_sessions: Mutex<HashMap<String, ChatSession>>,
    pub ai_providers: Mutex<Vec<AiProvider>>,
    pub user_preferences: Mutex<HashMap<String, serde_json::Value>>,
}

impl AppState {
    pub fn new() -> Self {
        Self::default()
    }
    
    pub async fn initialize(&self) -> Result<()> {
        tracing::info!("Initializing application state...");
        
        // Initialize AI providers
        self.initialize_ai_providers().await?;
        
        // Initialize user preferences
        self.initialize_user_preferences().await?;
        
        tracing::info!("Application state initialized successfully");
        Ok(())
    }
    
    async fn initialize_ai_providers(&self) -> Result<()> {
        let mut providers = self.ai_providers.lock().await;
        
        // Initialize with enterprise-grade AI providers
        providers.push(AiProvider {
            id: "claude".to_string(),
            name: "Claude (Anthropic)".to_string(),
            provider_type: "claude".to_string(),
            is_available: true,
            cost_per_token: 0.00001102, // Actual Claude pricing
            latency: 1500,
            specialties: vec!["reasoning".to_string(), "code".to_string(), "analysis".to_string()],
        });
        
        providers.push(AiProvider {
            id: "openai".to_string(),
            name: "GPT-4 (OpenAI)".to_string(),
            provider_type: "openai".to_string(),
            is_available: true,
            cost_per_token: 0.00003000,
            latency: 2000,
            specialties: vec!["general".to_string(), "creative".to_string()],
        });
        
        providers.push(AiProvider {
            id: "gemini".to_string(),
            name: "Gemini Pro (Google)".to_string(),
            provider_type: "gemini".to_string(),
            is_available: true,
            cost_per_token: 0.00000037, // 97% cheaper!
            latency: 800,
            specialties: vec!["fast".to_string(), "cost-effective".to_string()],
        });
        
        tracing::info!("Initialized {} AI providers", providers.len());
        Ok(())
    }
    
    async fn initialize_user_preferences(&self) -> Result<()> {
        let mut preferences = self.user_preferences.lock().await;
        
        // Set default preferences
        preferences.insert("theme".to_string(), serde_json::Value::String("dark".to_string()));
        preferences.insert("ai_cost_limit".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(10.0).unwrap()));
        preferences.insert("auto_save".to_string(), serde_json::Value::Bool(true));
        preferences.insert("default_ai_provider".to_string(), serde_json::Value::String("claude".to_string()));
        
        tracing::info!("Initialized user preferences");
        Ok(())
    }
    
    // ================================
    // PROJECT STATE MANAGEMENT
    // ================================
    
    pub async fn set_current_project(&self, project: ProjectContext) -> Result<()> {
        let mut current_project = self.current_project.lock().await;
        *current_project = Some(project);
        Ok(())
    }
    
    pub async fn get_current_project(&self) -> Option<ProjectContext> {
        let current_project = self.current_project.lock().await;
        current_project.clone()
    }
    
    pub async fn clear_current_project(&self) {
        let mut current_project = self.current_project.lock().await;
        *current_project = None;
    }
    
    // ================================
    // AI PROVIDER STATE MANAGEMENT
    // ================================
    
    pub async fn get_ai_providers(&self) -> Vec<AiProvider> {
        let providers = self.ai_providers.lock().await;
        providers.clone()
    }
    
    pub async fn get_ai_provider(&self, id: &str) -> Option<AiProvider> {
        let providers = self.ai_providers.lock().await;
        providers.iter().find(|p| p.id == id).cloned()
    }
    
    pub async fn update_ai_provider_availability(&self, id: &str, available: bool) -> Result<()> {
        let mut providers = self.ai_providers.lock().await;
        if let Some(provider) = providers.iter_mut().find(|p| p.id == id) {
            provider.is_available = available;
            tracing::info!("Updated provider {} availability to {}", id, available);
            Ok(())
        } else {
            Err(SyntariError::ai("PROVIDER_NOT_FOUND", &format!("Provider {} not found", id)))
        }
    }
    
    // ================================
    // CHAT SESSION STATE MANAGEMENT
    // ================================
    
    pub async fn add_chat_session(&self, session: ChatSession) -> Result<()> {
        let mut sessions = self.chat_sessions.lock().await;
        sessions.insert(session.id.clone(), session);
        Ok(())
    }
    
    pub async fn get_chat_session(&self, id: &str) -> Option<ChatSession> {
        let sessions = self.chat_sessions.lock().await;
        sessions.get(id).cloned()
    }
    
    pub async fn update_chat_session(&self, session: ChatSession) -> Result<()> {
        let mut sessions = self.chat_sessions.lock().await;
        sessions.insert(session.id.clone(), session);
        Ok(())
    }
    
    pub async fn remove_chat_session(&self, id: &str) -> Result<()> {
        let mut sessions = self.chat_sessions.lock().await;
        if sessions.remove(id).is_some() {
            tracing::info!("Removed chat session: {}", id);
            Ok(())
        } else {
            Err(SyntariError::chat("SESSION_NOT_FOUND", &format!("Session {} not found", id)))
        }
    }
    
    pub async fn list_chat_sessions(&self) -> Vec<ChatSession> {
        let sessions = self.chat_sessions.lock().await;
        sessions.values().cloned().collect()
    }
    
    // ================================
    // USER PREFERENCES MANAGEMENT
    // ================================
    
    pub async fn get_preference(&self, key: &str) -> Option<serde_json::Value> {
        let preferences = self.user_preferences.lock().await;
        preferences.get(key).cloned()
    }
    
    pub async fn set_preference(&self, key: &str, value: serde_json::Value) -> Result<()> {
        let mut preferences = self.user_preferences.lock().await;
        preferences.insert(key.to_string(), value);
        tracing::debug!("Updated preference: {}", key);
        Ok(())
    }
    
    pub async fn get_all_preferences(&self) -> HashMap<String, serde_json::Value> {
        let preferences = self.user_preferences.lock().await;
        preferences.clone()
    }
    
    // ================================
    // UTILITY METHODS
    // ================================
    
    pub async fn get_stats(&self) -> HashMap<String, serde_json::Value> {
        let mut stats = HashMap::new();
        
        let providers = self.ai_providers.lock().await;
        let sessions = self.chat_sessions.lock().await;
        let current_project = self.current_project.lock().await;
        
        stats.insert("ai_providers_count".to_string(), serde_json::Value::Number(serde_json::Number::from(providers.len())));
        stats.insert("chat_sessions_count".to_string(), serde_json::Value::Number(serde_json::Number::from(sessions.len())));
        stats.insert("has_current_project".to_string(), serde_json::Value::Bool(current_project.is_some()));
        
        if let Some(project) = current_project.as_ref() {
            stats.insert("project_type".to_string(), serde_json::Value::String(project.project_type.clone()));
            stats.insert("project_files_count".to_string(), serde_json::Value::Number(serde_json::Number::from(project.open_files.len())));
        }
        
        stats
    }
} 