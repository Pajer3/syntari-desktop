// Syntari AI IDE - Core Module
// Shared types, state, and infrastructure

pub mod types;
pub mod state;
pub mod error;
pub mod commands;

// Re-export commonly used types
pub use types::*;
pub use state::AppState;
pub use error::{SyntariError, Result}; 