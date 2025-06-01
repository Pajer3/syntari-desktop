// Syntari AI IDE - Error Handling
// Comprehensive error management following Rust best practices

use serde::{Deserialize, Serialize};
use std::fmt;

// ================================
// MAIN ERROR TYPE
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SyntariError {
    // Core Errors
    Initialization(String),
    Configuration(String),
    
    // AI-related Errors
    AiProviderUnavailable(String),
    AiRequestFailed(String),
    AiResponseInvalid(String),
    CostLimitExceeded(String),
    
    // File System Errors
    FileNotFound(String),
    FileAccessDenied(String),
    DirectoryNotFound(String),
    DirectoryAccessDenied(String),
    
    // Project Errors
    ProjectLoadFailed(String),
    ProjectAnalysisFailed(String),
    UnsupportedProjectType(String),
    
    // Chat Errors
    SessionNotFound(String),
    SessionCreateFailed(String),
    MessageSendFailed(String),
    
    // Network Errors
    NetworkTimeout(String),
    NetworkUnavailable(String),
    ApiError(String),
    
    // Validation Errors
    InvalidInput(String),
    ValidationFailed(String),
    
    // Security Errors
    AuthenticationFailed(String),
    AuthorizationFailed(String),
    SecurityViolation(String),
    
    // Generic Error
    Other(String),
}

impl fmt::Display for SyntariError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SyntariError::Initialization(msg) => write!(f, "Initialization error: {}", msg),
            SyntariError::Configuration(msg) => write!(f, "Configuration error: {}", msg),
            SyntariError::AiProviderUnavailable(msg) => write!(f, "AI provider unavailable: {}", msg),
            SyntariError::AiRequestFailed(msg) => write!(f, "AI request failed: {}", msg),
            SyntariError::AiResponseInvalid(msg) => write!(f, "AI response invalid: {}", msg),
            SyntariError::CostLimitExceeded(msg) => write!(f, "Cost limit exceeded: {}", msg),
            SyntariError::FileNotFound(msg) => write!(f, "File not found: {}", msg),
            SyntariError::FileAccessDenied(msg) => write!(f, "File access denied: {}", msg),
            SyntariError::DirectoryNotFound(msg) => write!(f, "Directory not found: {}", msg),
            SyntariError::DirectoryAccessDenied(msg) => write!(f, "Directory access denied: {}", msg),
            SyntariError::ProjectLoadFailed(msg) => write!(f, "Project load failed: {}", msg),
            SyntariError::ProjectAnalysisFailed(msg) => write!(f, "Project analysis failed: {}", msg),
            SyntariError::UnsupportedProjectType(msg) => write!(f, "Unsupported project type: {}", msg),
            SyntariError::SessionNotFound(msg) => write!(f, "Session not found: {}", msg),
            SyntariError::SessionCreateFailed(msg) => write!(f, "Session create failed: {}", msg),
            SyntariError::MessageSendFailed(msg) => write!(f, "Message send failed: {}", msg),
            SyntariError::NetworkTimeout(msg) => write!(f, "Network timeout: {}", msg),
            SyntariError::NetworkUnavailable(msg) => write!(f, "Network unavailable: {}", msg),
            SyntariError::ApiError(msg) => write!(f, "API error: {}", msg),
            SyntariError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
            SyntariError::ValidationFailed(msg) => write!(f, "Validation failed: {}", msg),
            SyntariError::AuthenticationFailed(msg) => write!(f, "Authentication failed: {}", msg),
            SyntariError::AuthorizationFailed(msg) => write!(f, "Authorization failed: {}", msg),
            SyntariError::SecurityViolation(msg) => write!(f, "Security violation: {}", msg),
            SyntariError::Other(msg) => write!(f, "Error: {}", msg),
        }
    }
}

impl std::error::Error for SyntariError {}

// ================================
// RESULT TYPE ALIAS
// ================================

pub type Result<T> = std::result::Result<T, SyntariError>;

// ================================
// ERROR CONVERSION IMPLEMENTATIONS
// ================================

impl From<std::io::Error> for SyntariError {
    fn from(error: std::io::Error) -> Self {
        match error.kind() {
            std::io::ErrorKind::NotFound => SyntariError::FileNotFound(error.to_string()),
            std::io::ErrorKind::PermissionDenied => SyntariError::FileAccessDenied(error.to_string()),
            _ => SyntariError::Other(error.to_string()),
        }
    }
}

impl From<anyhow::Error> for SyntariError {
    fn from(error: anyhow::Error) -> Self {
        SyntariError::Other(error.to_string())
    }
}

impl From<serde_json::Error> for SyntariError {
    fn from(error: serde_json::Error) -> Self {
        SyntariError::ValidationFailed(format!("JSON parsing error: {}", error))
    }
}

impl From<reqwest::Error> for SyntariError {
    fn from(error: reqwest::Error) -> Self {
        if error.is_timeout() {
            SyntariError::NetworkTimeout(error.to_string())
        } else if error.is_connect() {
            SyntariError::NetworkUnavailable(error.to_string())
        } else {
            SyntariError::ApiError(error.to_string())
        }
    }
}

// ================================
// ERROR CONTEXT HELPERS
// ================================

impl SyntariError {
    pub fn with_context(self, context: &str) -> Self {
        match self {
            SyntariError::Other(msg) => SyntariError::Other(format!("{}: {}", context, msg)),
            _ => self,
        }
    }
    
    pub fn is_recoverable(&self) -> bool {
        match self {
            SyntariError::NetworkTimeout(_) |
            SyntariError::NetworkUnavailable(_) |
            SyntariError::AiProviderUnavailable(_) => true,
            SyntariError::AuthenticationFailed(_) |
            SyntariError::AuthorizationFailed(_) |
            SyntariError::SecurityViolation(_) => false,
            _ => true,
        }
    }
    
    pub fn severity(&self) -> &'static str {
        match self {
            SyntariError::SecurityViolation(_) |
            SyntariError::AuthenticationFailed(_) |
            SyntariError::AuthorizationFailed(_) => "critical",
            SyntariError::CostLimitExceeded(_) |
            SyntariError::ProjectLoadFailed(_) => "high",
            SyntariError::NetworkTimeout(_) |
            SyntariError::AiProviderUnavailable(_) => "medium",
            _ => "low",
        }
    }
    
    pub fn error_code(&self) -> &'static str {
        match self {
            SyntariError::Initialization(_) => "INIT_ERROR",
            SyntariError::Configuration(_) => "CONFIG_ERROR",
            SyntariError::AiProviderUnavailable(_) => "AI_PROVIDER_UNAVAILABLE",
            SyntariError::AiRequestFailed(_) => "AI_REQUEST_FAILED",
            SyntariError::AiResponseInvalid(_) => "AI_RESPONSE_INVALID",
            SyntariError::CostLimitExceeded(_) => "COST_LIMIT_EXCEEDED",
            SyntariError::FileNotFound(_) => "FILE_NOT_FOUND",
            SyntariError::FileAccessDenied(_) => "FILE_ACCESS_DENIED",
            SyntariError::DirectoryNotFound(_) => "DIR_NOT_FOUND",
            SyntariError::DirectoryAccessDenied(_) => "DIR_ACCESS_DENIED",
            SyntariError::ProjectLoadFailed(_) => "PROJECT_LOAD_FAILED",
            SyntariError::ProjectAnalysisFailed(_) => "PROJECT_ANALYSIS_FAILED",
            SyntariError::UnsupportedProjectType(_) => "UNSUPPORTED_PROJECT_TYPE",
            SyntariError::SessionNotFound(_) => "SESSION_NOT_FOUND",
            SyntariError::SessionCreateFailed(_) => "SESSION_CREATE_FAILED",
            SyntariError::MessageSendFailed(_) => "MESSAGE_SEND_FAILED",
            SyntariError::NetworkTimeout(_) => "NETWORK_TIMEOUT",
            SyntariError::NetworkUnavailable(_) => "NETWORK_UNAVAILABLE",
            SyntariError::ApiError(_) => "API_ERROR",
            SyntariError::InvalidInput(_) => "INVALID_INPUT",
            SyntariError::ValidationFailed(_) => "VALIDATION_FAILED",
            SyntariError::AuthenticationFailed(_) => "AUTH_FAILED",
            SyntariError::AuthorizationFailed(_) => "AUTHZ_FAILED",
            SyntariError::SecurityViolation(_) => "SECURITY_VIOLATION",
            SyntariError::Other(_) => "UNKNOWN_ERROR",
        }
    }
} 