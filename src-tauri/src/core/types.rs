// Syntari AI IDE - Core Types
// Shared data structures across all domains

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Re-export the main error system from errors module
pub use super::errors::{AppError, AppResult, ErrorContext};

// ================================
// COMMON RESULT TYPE
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TauriResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> TauriResult<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }
    
    pub fn error(message: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message.into()),
        }
    }
    
    /// Convert from AppResult to TauriResult for frontend communication
    pub fn from_result<E: std::fmt::Display>(result: Result<T, E>) -> Self {
        match result {
            Ok(data) => Self::success(data),
            Err(error) => Self::error(error.to_string()),
        }
    }
}

// ================================
// FILE SYSTEM TYPES
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub extension: String,
    pub size: u64,
    pub last_modified: u64,
    pub content: Option<String>,
    pub language: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DirectoryInfo {
    pub path: String,
    pub name: String,
    pub depth: u32,
    pub last_modified: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileInfoChunk {
    pub path: String,
    pub name: String,
    pub depth: u32,
    pub size: u64,
    pub last_modified: u64,
    pub extension: String,
    pub is_directory: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanFilesResult {
    pub files: Vec<FileInfoChunk>,
    pub has_more: bool,
}

// ================================
// PERFORMANCE METRICS TYPES
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub scan_count: u64,
    pub total_nodes: u64,
    pub memory_saved_bytes: u64,
    pub avg_response_time_ms: u64,
}

// ================================
// UTILITY FUNCTIONS
// ================================

pub fn current_timestamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

pub fn generate_id() -> String {
    uuid::Uuid::new_v4().to_string()
} 