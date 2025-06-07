// Syntari AI IDE - Core Module
// Shared types, state, and infrastructure

pub mod types;
pub mod state;
pub mod errors; // Unified error system
pub mod commands;

// Re-export commonly used types
pub use types::*;
pub use state::AppState;

// Unified error system (only one system now)
pub use errors::{AppError, AppResult, ErrorContext};

// Result type alias for backwards compatibility
pub type Result<T> = AppResult<T>;
pub type SyntariError = AppError; 