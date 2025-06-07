// Core Error System - Centralized Error Handling for Tauri Backend
use serde::{Deserialize, Serialize};
use std::fmt;

/// Main application error type that encompasses all possible errors
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AppError {
    /// File system related errors
    Filesystem {
        code: String,
        message: String,
        path: Option<String>,
    },
    
    /// Permission/security related errors
    Permission {
        code: String,
        message: String,
        resource: String,
    },
    
    /// AI/LLM provider errors
    Ai {
        code: String,
        message: String,
        provider: Option<String>,
        cost: Option<f64>,
    },
    
    /// Project/workspace related errors
    Project {
        code: String,
        message: String,
        project_path: Option<String>,
    },
    
    /// Chat/session related errors
    Chat {
        code: String,
        message: String,
        session_id: Option<String>,
    },
    
    /// Configuration errors
    Config {
        code: String,
        message: String,
        key: Option<String>,
    },
    
    /// Network/external service errors
    Network {
        code: String,
        message: String,
        url: Option<String>,
        status: Option<u16>,
    },
    
    /// Validation errors (user input, etc.)
    Validation {
        code: String,
        message: String,
        field: Option<String>,
    },
    
    /// Internal/unexpected errors
    Internal {
        code: String,
        message: String,
        source: Option<String>,
    },
}

impl AppError {
    /// Create a filesystem error
    pub fn filesystem<S: Into<String>>(code: S, message: S) -> Self {
        Self::Filesystem {
            code: code.into(),
            message: message.into(),
            path: None,
        }
    }
    
    /// Create a filesystem error with path
    pub fn filesystem_with_path<S: Into<String>>(code: S, message: S, path: S) -> Self {
        Self::Filesystem {
            code: code.into(),
            message: message.into(),
            path: Some(path.into()),
        }
    }
    
    /// Create a permission error
    pub fn permission<S: Into<String>>(code: S, message: S, resource: S) -> Self {
        Self::Permission {
            code: code.into(),
            message: message.into(),
            resource: resource.into(),
        }
    }
    
    /// Create an AI provider error
    pub fn ai<S: Into<String>>(code: S, message: S) -> Self {
        Self::Ai {
            code: code.into(),
            message: message.into(),
            provider: None,
            cost: None,
        }
    }
    
    /// Create an AI provider error with details
    pub fn ai_with_details<S: Into<String>>(
        code: S, 
        message: S, 
        provider: Option<S>, 
        cost: Option<f64>
    ) -> Self {
        Self::Ai {
            code: code.into(),
            message: message.into(),
            provider: provider.map(|p| p.into()),
            cost,
        }
    }
    
    /// Create a validation error
    pub fn validation<S: Into<String>>(code: S, message: S) -> Self {
        Self::Validation {
            code: code.into(),
            message: message.into(),
            field: None,
        }
    }
    
    /// Create a validation error with field
    pub fn validation_with_field<S: Into<String>>(code: S, message: S, field: S) -> Self {
        Self::Validation {
            code: code.into(),
            message: message.into(),
            field: Some(field.into()),
        }
    }
    
    /// Create an internal error
    pub fn internal<S: Into<String>>(code: S, message: S) -> Self {
        Self::Internal {
            code: code.into(),
            message: message.into(),
            source: None,
        }
    }
    
    /// Create a chat error
    pub fn chat<S: Into<String>>(code: S, message: S) -> Self {
        Self::Chat {
            code: code.into(),
            message: message.into(),
            session_id: None,
        }
    }
    
    /// Create a chat error with session ID
    pub fn chat_with_session<S: Into<String>>(code: S, message: S, session_id: S) -> Self {
        Self::Chat {
            code: code.into(),
            message: message.into(),
            session_id: Some(session_id.into()),
        }
    }
    
    /// Create a project error
    pub fn project<S: Into<String>>(code: S, message: S) -> Self {
        Self::Project {
            code: code.into(),
            message: message.into(),
            project_path: None,
        }
    }
    
    /// Create a project error with path
    pub fn project_with_path<S: Into<String>>(code: S, message: S, project_path: S) -> Self {
        Self::Project {
            code: code.into(),
            message: message.into(),
            project_path: Some(project_path.into()),
        }
    }
    
    /// Get the error code
    pub fn code(&self) -> &str {
        match self {
            AppError::Filesystem { code, .. } => code,
            AppError::Permission { code, .. } => code,
            AppError::Ai { code, .. } => code,
            AppError::Project { code, .. } => code,
            AppError::Chat { code, .. } => code,
            AppError::Config { code, .. } => code,
            AppError::Network { code, .. } => code,
            AppError::Validation { code, .. } => code,
            AppError::Internal { code, .. } => code,
        }
    }
    
    /// Get the error message
    pub fn message(&self) -> &str {
        match self {
            AppError::Filesystem { message, .. } => message,
            AppError::Permission { message, .. } => message,
            AppError::Ai { message, .. } => message,
            AppError::Project { message, .. } => message,
            AppError::Chat { message, .. } => message,
            AppError::Config { message, .. } => message,
            AppError::Network { message, .. } => message,
            AppError::Validation { message, .. } => message,
            AppError::Internal { message, .. } => message,
        }
    }
    
    /// Check if error is recoverable (for UI retry logic)
    pub fn is_recoverable(&self) -> bool {
        match self {
            AppError::Filesystem { .. } => true,
            AppError::Permission { .. } => false, // Permissions typically need user action
            AppError::Ai { .. } => true,
            AppError::Project { .. } => true,
            AppError::Chat { .. } => true,
            AppError::Config { .. } => false,
            AppError::Network { .. } => true,
            AppError::Validation { .. } => false, // User needs to fix input
            AppError::Internal { .. } => false, // Internal errors typically not recoverable
        }
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}] {}", self.code(), self.message())
    }
}

impl std::error::Error for AppError {}

// Conversion from std::io::Error to AppError
impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        let code = match error.kind() {
            std::io::ErrorKind::NotFound => "FS_NOT_FOUND",
            std::io::ErrorKind::PermissionDenied => "FS_PERMISSION_DENIED",
            std::io::ErrorKind::AlreadyExists => "FS_ALREADY_EXISTS",
            std::io::ErrorKind::InvalidInput => "FS_INVALID_INPUT",
            std::io::ErrorKind::InvalidData => "FS_INVALID_DATA",
            std::io::ErrorKind::TimedOut => "FS_TIMEOUT",
            std::io::ErrorKind::Interrupted => "FS_INTERRUPTED",
            std::io::ErrorKind::UnexpectedEof => "FS_UNEXPECTED_EOF",
            std::io::ErrorKind::OutOfMemory => "FS_OUT_OF_MEMORY",
            _ => "FS_UNKNOWN",
        };
        
        Self::Filesystem {
            code: code.to_string(),
            message: error.to_string(),
            path: None,
        }
    }
}

// Conversion from serde_json::Error to AppError
impl From<serde_json::Error> for AppError {
    fn from(error: serde_json::Error) -> Self {
        Self::Internal {
            code: "JSON_ERROR".to_string(),
            message: format!("JSON processing error: {}", error),
            source: None,
        }
    }
}

// Result type alias for convenience
pub type AppResult<T> = Result<T, AppError>;

/// Error context trait for chaining errors with additional context
pub trait ErrorContext<T> {
    fn with_context<F>(self, f: F) -> AppResult<T>
    where
        F: FnOnce() -> String;
        
    fn with_filesystem_context<P: AsRef<std::path::Path>>(self, path: P) -> AppResult<T>;
}

impl<T> ErrorContext<T> for AppResult<T> {
    fn with_context<F>(self, f: F) -> AppResult<T>
    where
        F: FnOnce() -> String,
    {
        self.map_err(|mut error| {
            match &mut error {
                AppError::Internal { message, .. } => {
                    *message = format!("{}: {}", f(), message);
                }
                _ => {
                    // Convert other errors to internal with context
                    error = AppError::Internal {
                        code: "CONTEXT_ERROR".to_string(),
                        message: format!("{}: {}", f(), error.message()),
                        source: None,
                    };
                }
            }
            error
        })
    }
    
    fn with_filesystem_context<P: AsRef<std::path::Path>>(self, path: P) -> AppResult<T> {
        self.map_err(|error| {
            match error {
                AppError::Filesystem { code, message, .. } => {
                    AppError::Filesystem {
                        code,
                        message,
                        path: Some(path.as_ref().to_string_lossy().to_string()),
                    }
                }
                other => other,
            }
        })
    }
}

// Macro for creating errors quickly
#[macro_export]
macro_rules! app_error {
    (filesystem, $code:expr, $message:expr) => {
        $crate::core::errors::AppError::filesystem($code, $message)
    };
    (filesystem, $code:expr, $message:expr, $path:expr) => {
        $crate::core::errors::AppError::filesystem_with_path($code, $message, $path)
    };
    (permission, $code:expr, $message:expr, $resource:expr) => {
        $crate::core::errors::AppError::permission($code, $message, $resource)
    };
    (ai, $code:expr, $message:expr) => {
        $crate::core::errors::AppError::ai($code, $message)
    };
    (validation, $code:expr, $message:expr) => {
        $crate::core::errors::AppError::validation($code, $message)
    };
    (internal, $code:expr, $message:expr) => {
        $crate::core::errors::AppError::internal($code, $message)
    };
}

/// Logging utility for errors
impl AppError {
    pub fn log_error(&self) {
        tracing::error!(
            code = self.code(),
            message = self.message(),
            error_type = self.error_type(),
            recoverable = self.is_recoverable(),
            "Application error occurred"
        );
    }
    
    pub fn log_warn(&self) {
        tracing::warn!(
            code = self.code(),
            message = self.message(),
            error_type = self.error_type(),
            "Application warning"
        );
    }
    
    fn error_type(&self) -> &'static str {
        match self {
            AppError::Filesystem { .. } => "filesystem",
            AppError::Permission { .. } => "permission",
            AppError::Ai { .. } => "ai",
            AppError::Project { .. } => "project",
            AppError::Chat { .. } => "chat",
            AppError::Config { .. } => "config",
            AppError::Network { .. } => "network",
            AppError::Validation { .. } => "validation",
            AppError::Internal { .. } => "internal",
        }
    }
} 