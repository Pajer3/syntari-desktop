// Syntari AI IDE - Chat Domain Types
// Data structures for chat sessions and messaging

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::project::types::ProjectContext;

// ================================
// CHAT MESSAGE TYPES
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub message_type: String, // 'user' | 'ai' | 'system'
    pub content: String,
    pub timestamp: u64,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

impl ChatMessage {
    pub fn user_message(content: impl Into<String>) -> Self {
        Self {
            id: crate::core::generate_id(),
            message_type: "user".to_string(),
            content: content.into(),
            timestamp: crate::core::current_timestamp(),
            metadata: None,
        }
    }
    
    pub fn ai_message(content: impl Into<String>) -> Self {
        Self {
            id: crate::core::generate_id(),
            message_type: "ai".to_string(),
            content: content.into(),
            timestamp: crate::core::current_timestamp(),
            metadata: None,
        }
    }
    
    pub fn system_message(content: impl Into<String>) -> Self {
        Self {
            id: crate::core::generate_id(),
            message_type: "system".to_string(),
            content: content.into(),
            timestamp: crate::core::current_timestamp(),
            metadata: None,
        }
    }
    
    pub fn with_metadata(mut self, metadata: HashMap<String, serde_json::Value>) -> Self {
        self.metadata = Some(metadata);
        self
    }
    
    pub fn is_user_message(&self) -> bool {
        self.message_type == "user"
    }
    
    pub fn is_ai_message(&self) -> bool {
        self.message_type == "ai"
    }
    
    pub fn is_system_message(&self) -> bool {
        self.message_type == "system"
    }
}

// ================================
// CHAT SESSION TYPES
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatSession {
    pub id: String,
    pub name: String,
    pub messages: Vec<ChatMessage>,
    pub context: ProjectContext,
    pub created_at: u64,
    pub updated_at: u64,
}

impl ChatSession {
    pub fn new(name: impl Into<String>, context: ProjectContext) -> Self {
        let now = crate::core::current_timestamp();
        
        Self {
            id: crate::core::generate_id(),
            name: name.into(),
            messages: Vec::new(),
            context,
            created_at: now,
            updated_at: now,
        }
    }
    
    pub fn add_message(&mut self, message: ChatMessage) {
        self.messages.push(message);
        self.updated_at = crate::core::current_timestamp();
    }
    
    pub fn message_count(&self) -> usize {
        self.messages.len()
    }
    
    pub fn last_message(&self) -> Option<&ChatMessage> {
        self.messages.last()
    }
    
    pub fn user_messages(&self) -> Vec<&ChatMessage> {
        self.messages.iter().filter(|m| m.is_user_message()).collect()
    }
    
    pub fn ai_messages(&self) -> Vec<&ChatMessage> {
        self.messages.iter().filter(|m| m.is_ai_message()).collect()
    }
    
    pub fn get_conversation_history(&self, limit: Option<usize>) -> Vec<&ChatMessage> {
        match limit {
            Some(l) => {
                let start = if self.messages.len() > l {
                    self.messages.len() - l
                } else {
                    0
                };
                self.messages[start..].iter().collect()
            }
            None => self.messages.iter().collect(),
        }
    }
    
    pub fn clear_messages(&mut self) {
        self.messages.clear();
        self.updated_at = crate::core::current_timestamp();
    }
}

// ================================
// CHAT CONTEXT TYPES
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatContext {
    pub session_id: String,
    pub active_file: Option<String>,
    pub selected_text: Option<String>,
    pub cursor_position: Option<CursorPosition>,
    pub ai_preferences: Option<AiPreferences>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CursorPosition {
    pub line: u32,
    pub column: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiPreferences {
    pub preferred_provider: Option<String>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
    pub include_project_context: bool,
}

impl AiPreferences {
    pub fn default() -> Self {
        Self {
            preferred_provider: None,
            max_tokens: Some(2000),
            temperature: Some(0.7),
            include_project_context: true,
        }
    }
} 