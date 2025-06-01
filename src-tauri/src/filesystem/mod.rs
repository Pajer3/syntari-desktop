// Syntari AI IDE - Filesystem Domain Module
// File and directory operations, scanning, and permissions

pub mod service;
pub mod commands;
pub mod scanner;

// Re-export commonly used types
pub use service::FilesystemService; 