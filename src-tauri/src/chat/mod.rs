// Syntari AI IDE - Chat Domain Module
// Chat sessions, messaging, and conversation management

pub mod types;
pub mod service;
pub mod commands;

// Re-export commonly used types
pub use types::*;
pub use service::ChatService; 