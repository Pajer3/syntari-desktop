// Syntari AI IDE - Filesystem Domain Module
// File and directory operations, scanning, and permissions

pub mod service;
pub mod commands;
pub mod scanner;
pub mod watcher;

// Re-export commonly used types
pub use service::FilesystemService;
pub use watcher::{FileSystemWatcher, FileSystemEvent, WatcherInfo}; 