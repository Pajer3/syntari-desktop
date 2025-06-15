// Syntari AI IDE - Terminal Commands
// Real pseudo-terminal implementation like VS Code

use portable_pty::CommandBuilder;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{command, State};
use tokio::sync::mpsc;
use tokio::sync::mpsc::error::TryRecvError;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CommandResult {
    pub output: String,
    pub exit_code: i32,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct TerminalInfo {
    pub shell: String,
    pub working_directory: String,
    pub environment_variables: Vec<(String, String)>,
    pub os: String,
    pub arch: String,
    pub family: String,
    pub username: String,
    pub hostname: String,
}

// Terminal session manager - like VS Code's terminal backend
pub struct TerminalSession {
    pub id: String,
    pub pty: Arc<Mutex<Box<dyn portable_pty::MasterPty + Send>>>,
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub output_receiver: Arc<Mutex<mpsc::Receiver<String>>>,
}

pub struct TerminalManager {
    sessions: Arc<Mutex<HashMap<String, TerminalSession>>>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn create_session(&self, working_dir: &str) -> Result<String, String> {
        let pty_system = portable_pty::native_pty_system();
        
        // Create pty with reasonable default size - frontend will resize to fit container
        let pty_pair = pty_system
            .openpty(portable_pty::PtySize {
                rows: 24,   // Standard terminal height
                cols: 80,   // Standard terminal width - will be resized by frontend
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to create pty: {}", e))?;

        // Determine shell based on platform
        let shell = if cfg!(target_os = "windows") {
            std::env::var("COMSPEC").unwrap_or_else(|_| "cmd.exe".to_string())
        } else {
            std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
        };

        // Create command builder
        let cmd = CommandBuilder::new(&shell);
        let mut cmd = cmd;

        // Set working directory
        cmd.cwd(working_dir);

        // Spawn the shell process in the pty
        let child = pty_pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell: {}", e))?;
        


        // Get reader and writer
        let mut reader = pty_pair.master.try_clone_reader()
            .map_err(|e| format!("Failed to clone reader: {}", e))?;
        let writer = pty_pair.master.take_writer()
            .map_err(|e| format!("Failed to get writer: {}", e))?;

        // Create output channel
        let (output_sender, output_receiver) = mpsc::channel(1000);

        // Generate session ID
        let session_id = uuid::Uuid::new_v4().to_string();

        // Spawn background thread to read output
        let output_sender = Arc::new(Mutex::new(output_sender));
        thread::spawn(move || {
            let mut buffer = [0u8; 8192];
            
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        let output = String::from_utf8_lossy(&buffer[..n]).to_string();
                        if let Ok(sender) = output_sender.lock() {
                            if sender.try_send(output).is_err() {
                                break; // Channel closed
                            }
                        }
                    }
                    Err(_) => {
                        thread::sleep(Duration::from_millis(10));
                    }
                }
            }
        });

        // Create terminal session
        let session = TerminalSession {
            id: session_id.clone(),
            pty: Arc::new(Mutex::new(pty_pair.master)),
            writer: Arc::new(Mutex::new(writer)),
            output_receiver: Arc::new(Mutex::new(output_receiver)),
        };

        // Store session
        if let Ok(mut sessions) = self.sessions.lock() {
            sessions.insert(session_id.clone(), session);
        }

        // Give the shell a moment to initialize and send its prompt
        thread::sleep(Duration::from_millis(100));


        Ok(session_id)
    }

    pub fn send_input(&self, session_id: &str, input: &str) -> Result<(), String> {
        let sessions = self.sessions.lock()
            .map_err(|_| "Failed to lock sessions")?;
        
        let session = sessions.get(session_id)
            .ok_or_else(|| format!("Session {} not found", session_id))?;

        let mut writer = session.writer.lock()
            .map_err(|_| "Failed to lock writer")?;

        // Send raw input (let the shell handle line endings)
        writer.write_all(input.as_bytes())
            .map_err(|e| format!("Failed to write to terminal: {}", e))?;
        
        writer.flush()
            .map_err(|e| format!("Failed to flush terminal: {}", e))?;

        Ok(())
    }

    pub fn read_output(&self, session_id: &str, timeout_ms: u64) -> Result<String, String> {
        let sessions = self.sessions.lock()
            .map_err(|_| "Failed to lock sessions")?;
        
        let session = sessions.get(session_id)
            .ok_or_else(|| format!("Session {} not found", session_id))?;

        let mut receiver = session.output_receiver.lock()
            .map_err(|_| "Failed to lock receiver")?;

        let mut output = String::new();
        let start = std::time::Instant::now();
        let _timeout = Duration::from_millis(timeout_ms);

        // First, try to get immediate output (non-blocking)
        let mut got_output = false;
        while let Ok(chunk) = receiver.try_recv() {
            output.push_str(&chunk);
            got_output = true;
        }

        // If we got output immediately, return it
        if got_output {
            return Ok(output);
        }

        // Otherwise, wait with a shorter timeout for responsiveness
        let short_timeout = std::cmp::min(timeout_ms, 200); // Max 200ms wait
        let short_timeout_duration = Duration::from_millis(short_timeout);
        
        while start.elapsed() < short_timeout_duration {
            match receiver.try_recv() {
                Ok(chunk) => {
                    output.push_str(&chunk);
                }
                Err(TryRecvError::Empty) => {
                    thread::sleep(Duration::from_millis(5)); // Faster polling
                }
                Err(TryRecvError::Disconnected) => break,
            }
        }

        Ok(output)
    }

    pub fn resize_session(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let sessions = self.sessions.lock()
            .map_err(|_| "Failed to lock sessions")?;
        
        let session = sessions.get(session_id)
            .ok_or_else(|| format!("Session {} not found", session_id))?;

        let pty = session.pty.lock()
            .map_err(|_| "Failed to lock pty")?;

        pty.resize(portable_pty::PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        }).map_err(|e| format!("Failed to resize terminal: {}", e))?;

        Ok(())
    }

    pub fn close_session(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock()
            .map_err(|_| "Failed to lock sessions")?;
        
        sessions.remove(session_id);
        Ok(())
    }
}

/// Create a new terminal session (like VS Code's terminal.createTerminal())
#[command]
pub async fn create_terminal_session(
    workingDirectory: String,
    terminal_manager: State<'_, TerminalManager>,
) -> Result<String, String> {
    terminal_manager.create_session(&workingDirectory)
}

/// Send input to terminal (like typing in VS Code terminal)
#[command]
pub async fn send_terminal_input(
    sessionId: String,
    input: String,
    terminal_manager: State<'_, TerminalManager>,
) -> Result<(), String> {
    terminal_manager.send_input(&sessionId, &input)
}

/// Read terminal output (like VS Code reading terminal output)
#[command]
pub async fn read_terminal_output(
    sessionId: String,
    timeoutMs: Option<u64>,
    terminal_manager: State<'_, TerminalManager>,
) -> Result<String, String> {
    let timeout = timeoutMs.unwrap_or(1000); // Default 1 second timeout
    terminal_manager.read_output(&sessionId, timeout)
}

/// Resize terminal session
#[command]
pub async fn resize_terminal_session(
    sessionId: String,
    cols: u16,
    rows: u16,
    terminal_manager: State<'_, TerminalManager>,
) -> Result<(), String> {
    terminal_manager.resize_session(&sessionId, cols, rows)
}

/// Close terminal session
#[command]
pub async fn close_terminal_session(
    sessionId: String,
    terminal_manager: State<'_, TerminalManager>,
) -> Result<(), String> {
    terminal_manager.close_session(&sessionId)
}

/// Execute a shell command in a terminal session (combines send + read)
#[command]
pub async fn execute_shell_command(
    sessionId: String,
    command: String,
    terminal_manager: State<'_, TerminalManager>,
) -> Result<CommandResult, String> {
    // Send the command
    terminal_manager.send_input(&sessionId, &command)?;
    
    // Wait a bit for command to execute
    tokio::time::sleep(Duration::from_millis(500)).await;
    
    // Read the output
    let output = terminal_manager.read_output(&sessionId, 2000)?;
    
    // For now, assume success (we'd need more sophisticated parsing for real exit codes)
    Ok(CommandResult {
        output,
        exit_code: 0,
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
    
    // Get OS information
    let os = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();
    let family = std::env::consts::FAMILY.to_string();
    
    // Get username
    let username = std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .unwrap_or_else(|_| "user".to_string());
    
    // Get hostname
    let hostname = if cfg!(target_os = "windows") {
        std::env::var("COMPUTERNAME").unwrap_or_else(|_| "localhost".to_string())
    } else {
        std::env::var("HOSTNAME")
            .or_else(|_| {
                // Try to read from /etc/hostname on Linux
                std::fs::read_to_string("/etc/hostname")
                    .map(|s| s.trim().to_string())
                    .or_else(|_| {
                        // Fallback to executing hostname command
                        std::process::Command::new("hostname")
                            .output()
                            .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
                    })
            })
            .unwrap_or_else(|_| "localhost".to_string())
    };

    Ok(TerminalInfo {
        shell,
        working_directory: current_dir.to_string_lossy().to_string(),
        environment_variables: env_vars,
        os,
        arch,
        family,
        username,
        hostname,
    })
}

// Legacy commands for backward compatibility - these will use the new pty system

/// Change working directory (legacy compatibility)
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

/// List directory contents (legacy compatibility)
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
        "working_directory": std::env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string())
    }))
} 