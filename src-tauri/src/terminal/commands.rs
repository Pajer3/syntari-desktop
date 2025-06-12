// Syntari AI IDE - Terminal Commands
// Rust backend for terminal operations via Tauri

use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::Path;
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResult {
    pub output: String,
    pub exit_code: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TerminalInfo {
    pub shell: String,
    pub working_directory: String,
    pub environment_variables: Vec<(String, String)>,
}

/// Execute a shell command in the specified working directory
#[command]
pub async fn execute_shell_command(
    command: String,
    working_directory: String,
) -> Result<CommandResult, String> {
    let working_dir = Path::new(&working_directory);
    
    if !working_dir.exists() {
        return Err(format!("Working directory does not exist: {}", working_directory));
    }

    // Determine shell based on platform
    let (shell, shell_arg) = if cfg!(target_os = "windows") {
        ("cmd", "/C")
    } else {
        ("sh", "-c")
    };

    // Execute the command
    let output = Command::new(shell)
        .arg(shell_arg)
        .arg(&command)
        .current_dir(working_dir)
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    
    // Combine stdout and stderr
    let combined_output = if stderr.is_empty() {
        stdout.to_string()
    } else if stdout.is_empty() {
        stderr.to_string()
    } else {
        format!("{}\n{}", stdout.trim(), stderr.trim())
    };

    Ok(CommandResult {
        output: combined_output,
        exit_code: output.status.code().unwrap_or(-1),
    })
}

/// Get terminal information
#[command]
pub async fn get_terminal_info() -> Result<TerminalInfo, String> {
    let shell = if cfg!(target_os = "windows") {
        std::env::var("COMSPEC").unwrap_or_else(|_| "cmd.exe".to_string())
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string())
    };

    let current_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;

    let env_vars: Vec<(String, String)> = std::env::vars().collect();

    Ok(TerminalInfo {
        shell,
        working_directory: current_dir.to_string_lossy().to_string(),
        environment_variables: env_vars,
    })
}

/// Change working directory
#[command]
pub async fn change_directory(path: String) -> Result<String, String> {
    let target_path = Path::new(&path);
    
    if !target_path.exists() {
        return Err(format!("Directory does not exist: {}", path));
    }

    if !target_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    std::env::set_current_dir(target_path)
        .map_err(|e| format!("Failed to change directory: {}", e))?;

    Ok(target_path.to_string_lossy().to_string())
}

/// List directory contents
#[command]
pub async fn list_directory(path: String) -> Result<Vec<String>, String> {
    let dir_path = Path::new(&path);
    
    if !dir_path.exists() {
        return Err(format!("Directory does not exist: {}", path));
    }

    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let entries = std::fs::read_dir(dir_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut items = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        items.push(file_name);
    }

    items.sort();
    Ok(items)
}

/// Kill a running process (for command cancellation)
#[command]
pub async fn kill_process(pid: u32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let output = Command::new("taskkill")
            .args(&["/PID", &pid.to_string(), "/F"])
            .output()
            .map_err(|e| format!("Failed to kill process: {}", e))?;
        
        if !output.status.success() {
            return Err(format!("Failed to kill process {}: {}", pid, 
                String::from_utf8_lossy(&output.stderr)));
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        use nix::sys::signal::{self, Signal};
        use nix::unistd::Pid;
        
        let pid = Pid::from_raw(pid as i32);
        signal::kill(pid, Signal::SIGTERM)
            .map_err(|e| format!("Failed to kill process: {}", e))?;
    }
    
    Ok(())
}

/// Get system information
#[command]
pub async fn get_system_info() -> Result<serde_json::Value, String> {
    use serde_json::json;
    
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    let family = std::env::consts::FAMILY;
    
    Ok(json!({
        "os": os,
        "arch": arch,
        "family": family,
        "executable": std::env::current_exe()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string()),
        "args": std::env::args().collect::<Vec<String>>(),
    }))
} 