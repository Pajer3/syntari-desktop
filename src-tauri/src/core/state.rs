// Syntari AI IDE - Application State
// Centralized state management with domain separation

use std::collections::HashMap;
use tokio::sync::Mutex;
use crate::core::{Result, SyntariError, StateCollection, OptionalStateValue, PreferenceManager};
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
    pub ai_providers: Mutex<HashMap<String, AiProvider>>, // Changed to HashMap for consistency
    pub user_preferences: Mutex<HashMap<String, serde_json::Value>>,
}

// ================================
// TRAIT IMPLEMENTATIONS FOR GENERIC STATE MANAGEMENT
// ================================

/// Implementation for managing AI providers collection
pub struct AiProviderCollection;

#[async_trait::async_trait]
impl StateCollection<AiProvider> for AiProviderCollection {
    fn collection_name() -> &'static str { "ai_providers" }
    fn item_name() -> &'static str { "AI provider" }
    
    fn get_id(item: &AiProvider) -> String {
        item.id.clone()
    }
}

/// Implementation for managing chat sessions collection
pub struct ChatSessionCollection;

#[async_trait::async_trait]
impl StateCollection<ChatSession> for ChatSessionCollection {
    fn collection_name() -> &'static str { "chat_sessions" }
    fn item_name() -> &'static str { "chat session" }
    
    fn get_id(item: &ChatSession) -> String {
        item.id.clone()
    }
}

/// Implementation for managing project context
pub struct ProjectContextValue;

#[async_trait::async_trait]
impl OptionalStateValue<ProjectContext> for ProjectContextValue {
    fn value_name() -> &'static str { "current project" }
}

/// Implementation for managing user preferences
pub struct UserPreferenceManager;

#[async_trait::async_trait]
impl PreferenceManager for UserPreferenceManager {}

// ================================
// APPLICATION STATE IMPLEMENTATION
// ================================

impl AppState {
    pub fn new() -> Self {
        Self::default()
    }
    
    /// Initialize the application state
    pub async fn initialize(&self) -> Result<()> {
        tracing::info!("Initializing application state...");
        
        // Initialize AI providers with default set
        let mut providers = self.ai_providers.lock().await;
        if providers.is_empty() {
            // Add default providers
            providers.insert("claude".to_string(), AiProvider {
                id: "claude".to_string(),
                name: "Claude 3.5 Sonnet".to_string(),
                provider_type: "anthropic".to_string(),
                is_available: true,
                cost_per_token: 0.003,
                latency: 200,
                specialties: vec!["coding".to_string(), "analysis".to_string()],
            });
            
            providers.insert("gpt4".to_string(), AiProvider {
                id: "gpt4".to_string(),
                name: "GPT-4 Turbo".to_string(),
                provider_type: "openai".to_string(),
                is_available: true,
                cost_per_token: 0.01,
                latency: 300,
                specialties: vec!["general".to_string(), "coding".to_string()],
            });
        }
        
        tracing::info!("Application state initialized successfully");
        Ok(())
    }
    
    // ================================
    // PROJECT STATE MANAGEMENT (using OptionalStateValue trait)
    // ================================
    
    pub async fn set_current_project(&self, project: ProjectContext) -> Result<()> {
        ProjectContextValue::set_value(&self.current_project, project).await
    }
    
    pub async fn get_current_project(&self) -> Option<ProjectContext> {
        ProjectContextValue::get_value(&self.current_project).await
    }
    
    pub async fn clear_current_project(&self) {
        ProjectContextValue::clear_value(&self.current_project).await
    }
    
    pub async fn has_current_project(&self) -> bool {
        ProjectContextValue::has_value(&self.current_project).await
    }
    
    // ================================
    // AI PROVIDER STATE MANAGEMENT (using StateCollection trait)
    // ================================
    
    pub async fn get_ai_providers(&self) -> Vec<AiProvider> {
        AiProviderCollection::list_items(&self.ai_providers).await
    }
    
    pub async fn get_ai_provider(&self, id: &str) -> Option<AiProvider> {
        AiProviderCollection::get_item(&self.ai_providers, id).await
    }
    
    pub async fn add_ai_provider(&self, provider: AiProvider) -> Result<()> {
        AiProviderCollection::add_item(&self.ai_providers, provider).await
    }
    
    pub async fn update_ai_provider(&self, provider: AiProvider) -> Result<()> {
        AiProviderCollection::update_item(&self.ai_providers, provider).await
    }
    
    pub async fn remove_ai_provider(&self, id: &str) -> Result<()> {
        AiProviderCollection::remove_item(&self.ai_providers, id).await
    }
    
    pub async fn update_ai_provider_availability(&self, id: &str, available: bool) -> Result<()> {
        if let Some(mut provider) = self.get_ai_provider(id).await {
            provider.is_available = available;
            self.update_ai_provider(provider).await?;
            tracing::info!("Updated provider {} availability to {}", id, available);
            Ok(())
        } else {
            Err(SyntariError::ai("PROVIDER_NOT_FOUND", &format!("Provider {} not found", id)))
        }
    }
    
    // ================================
    // CHAT SESSION STATE MANAGEMENT (using StateCollection trait)
    // ================================
    
    pub async fn add_chat_session(&self, session: ChatSession) -> Result<()> {
        ChatSessionCollection::add_item(&self.chat_sessions, session).await
    }
    
    pub async fn get_chat_session(&self, id: &str) -> Option<ChatSession> {
        ChatSessionCollection::get_item(&self.chat_sessions, id).await
    }
    
    pub async fn update_chat_session(&self, session: ChatSession) -> Result<()> {
        ChatSessionCollection::update_item(&self.chat_sessions, session).await
    }
    
    pub async fn remove_chat_session(&self, id: &str) -> Result<()> {
        ChatSessionCollection::remove_item(&self.chat_sessions, id).await
    }
    
    pub async fn list_chat_sessions(&self) -> Vec<ChatSession> {
        ChatSessionCollection::list_items(&self.chat_sessions).await
    }
    
    pub async fn chat_session_exists(&self, id: &str) -> bool {
        ChatSessionCollection::exists(&self.chat_sessions, id).await
    }
    
    pub async fn clear_chat_sessions(&self) {
        ChatSessionCollection::clear(&self.chat_sessions).await
    }
    
    // ================================
    // USER PREFERENCES MANAGEMENT (using PreferenceManager trait)
    // ================================
    
    pub async fn get_preference(&self, key: &str) -> Option<serde_json::Value> {
        UserPreferenceManager::get_preference(&self.user_preferences, key).await
    }
    
    pub async fn set_preference(&self, key: &str, value: serde_json::Value) -> Result<()> {
        UserPreferenceManager::set_preference(&self.user_preferences, key, value).await
    }
    
    pub async fn get_all_preferences(&self) -> HashMap<String, serde_json::Value> {
        UserPreferenceManager::get_all_preferences(&self.user_preferences).await
    }
    
    pub async fn remove_preference(&self, key: &str) -> Result<bool> {
        UserPreferenceManager::remove_preference(&self.user_preferences, key).await
    }
    
    pub async fn clear_preferences(&self) {
        UserPreferenceManager::clear_preferences(&self.user_preferences).await
    }
    
    // ================================
    // UTILITY METHODS
    // ================================
    
    pub async fn get_stats(&self) -> std::collections::HashMap<String, serde_json::Value> {
        let mut stats = std::collections::HashMap::new();
        
        let chat_count = self.chat_sessions.lock().await.len();
        let provider_count = self.ai_providers.lock().await.len();
        let preference_count = self.user_preferences.lock().await.len();
        
        stats.insert("chat_sessions".to_string(), serde_json::Value::Number(chat_count.into()));
        stats.insert("ai_providers".to_string(), serde_json::Value::Number(provider_count.into()));
        stats.insert("user_preferences".to_string(), serde_json::Value::Number(preference_count.into()));
        stats.insert("initialized".to_string(), serde_json::Value::Bool(true));
        
        stats
    }

    /// Get all AI providers
    pub async fn get_all_ai_providers(&self) -> Result<Vec<AiProvider>> {
        let providers = self.ai_providers.lock().await;
        Ok(providers.values().cloned().collect())
    }
} 