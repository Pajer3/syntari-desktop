// Syntari AI IDE - Core Types
// Shared data structures across all domains

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
}

// ================================
// ERROR TYPES
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppError {
    pub code: String,
    pub message: String,
    pub severity: String,
    pub timestamp: u64,
    pub context: Option<HashMap<String, serde_json::Value>>,
    pub recoverable: bool,
}

impl AppError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            severity: "error".to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            context: None,
            recoverable: true,
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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanFilesResult {
    pub files: Vec<FileInfoChunk>,
    pub has_more: bool,
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