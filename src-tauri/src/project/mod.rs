// Syntari AI IDE - Project Domain Module
// Project analysis, structure detection, and management

pub mod types;
pub mod service;
pub mod analyzer;
pub mod commands;

// Re-export commonly used types
pub use types::*;
pub use service::ProjectService; 