// Syntari AI IDE - Filesystem Commands Module
// Modular command organization for better maintainability

pub mod file_ops;
pub mod dir_ops;
pub mod scanning;
pub mod search;
pub mod dialog;

// Re-export all commands for easy access
pub use file_ops::*;
pub use dir_ops::*;
pub use scanning::*;
pub use search::*;
pub use dialog::*; 