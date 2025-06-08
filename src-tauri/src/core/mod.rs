// Syntari AI IDE - Core Module
// Shared types, state, and infrastructure

pub mod types;
pub mod state;
pub mod errors; // Unified error system
pub mod commands;
pub mod file_utils; // Shared file operation utilities
pub mod state_collections; // Generic state management patterns

// Re-export commonly used types
pub use types::*;
pub use state::AppState;

// Unified error system (only one system now)
pub use errors::{AppError, AppResult, ErrorContext};

// File utilities
pub use file_utils::*;

// State management utilities
pub use state_collections::{StateCollection, OptionalStateValue, PreferenceManager};

// Result type alias for backwards compatibility
pub type Result<T> = AppResult<T>;
pub type SyntariError = AppError; 