// Syntari AI IDE - Core Module
// Shared types, state, and infrastructure

pub mod types;
pub mod state;
pub mod error;
pub mod errors; // New centralized error system
pub mod commands;

// Re-export commonly used types
pub use types::*;
pub use state::AppState;

// Legacy error system (keeping for backwards compatibility)
pub use error::{SyntariError, Result};

// New error system (recommended for new code)
pub use errors::{AppError, AppResult, ErrorContext}; 