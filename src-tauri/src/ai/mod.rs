// Syntari AI IDE - AI Domain Module
// AI providers, routing, and response generation

pub mod types;
pub mod service;
pub mod router;
pub mod providers;
pub mod commands;
pub mod context7;

// Re-export commonly used types
pub use types::*;
pub use service::AiService; 