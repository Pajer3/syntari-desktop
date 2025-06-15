// Syntari AI IDE - AI Module
// Consolidated AI integration with smart routing and multi-model support

pub mod types;
pub mod commands;
pub mod context7;

// Re-export commonly used types
pub use types::{
    AiProvider, AiRequest, AiResponse, ConsensusResult,
    AiApiResponse, Context7LibraryResult, Context7DocsResult
};

// Note: The actual AI router implementation is in syntari-cli crate
// This module handles desktop app integration with the CLI backend 