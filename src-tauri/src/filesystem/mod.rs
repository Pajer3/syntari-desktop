// Syntari AI IDE - Filesystem Domain Module
// File and directory operations, scanning, and permissions

pub mod commands;
pub mod service;
pub mod scanner;
pub mod watcher;

// Re-export commonly used types and services
pub use service::FilesystemService;
pub use watcher::{FileSystemWatcher, FileSystemEvent, WatcherInfo};

// Re-export all command modules for easy access
pub use commands::*; 