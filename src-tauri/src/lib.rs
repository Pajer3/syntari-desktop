// Syntari AI IDE - Tauri Backend (MVVM Model Layer)
// Integrates with existing CLI AI router for enterprise-grade functionality

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{State, Manager};
use tokio::sync::Mutex;
use anyhow::{Result, Context};
use reqwest;
use serde_json::json;

// ================================
// CORE DATA MODELS (Model Layer)
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiProvider {
    pub id: String,
    pub name: String,
    pub provider_type: String,
    pub is_available: bool,
    pub cost_per_token: f64,
    pub latency: u64,
    pub specialties: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiRequest {
    pub id: String,
    pub prompt: String,
    pub context: Option<ProjectContext>,
    pub provider: Option<String>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiResponse {
    pub id: String,
    pub request_id: String,
    pub provider: String,
    pub content: String,
    pub confidence: f64,
    pub cost: f64,
    pub response_time: u64,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsensusResult {
    pub best_response: AiResponse,
    pub alternative_responses: Vec<AiResponse>,
    pub confidence_score: f64,
    pub total_cost: f64,
    pub reasoning: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectContext {
    pub root_path: String,
    pub project_type: String,
    pub open_files: Vec<FileInfo>,
    pub dependencies: Vec<String>,
    pub git_branch: Option<String>,
    pub active_framework: Option<String>,
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub message_type: String, // 'user' | 'ai' | 'system'
    pub content: String,
    pub timestamp: u64,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatSession {
    pub id: String,
    pub name: String,
    pub messages: Vec<ChatMessage>,
    pub context: ProjectContext,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppError {
    pub code: String,
    pub message: String,
    pub severity: String,
    pub timestamp: u64,
    pub context: Option<HashMap<String, serde_json::Value>>,
    pub recoverable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TauriResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

// ================================
// APPLICATION STATE (Shared Models)
// ================================

#[derive(Debug, Default)]
pub struct AppState {
    pub current_project: Mutex<Option<ProjectContext>>,
    pub chat_sessions: Mutex<HashMap<String, ChatSession>>,
    pub ai_providers: Mutex<Vec<AiProvider>>,
    pub user_preferences: Mutex<HashMap<String, serde_json::Value>>,
}

// ================================
// BUSINESS LOGIC LAYER (Model Operations)
// ================================

impl AppState {
    pub async fn initialize_ai_providers(&self) -> Result<()> {
        let mut providers = self.ai_providers.lock().await;
        
        // Initialize with your existing AI router providers
        providers.push(AiProvider {
            id: "claude".to_string(),
            name: "Claude (Anthropic)".to_string(),
            provider_type: "claude".to_string(),
            is_available: true,
            cost_per_token: 0.00001102, // Actual Claude pricing
            latency: 1500,
            specialties: vec!["reasoning".to_string(), "code".to_string(), "analysis".to_string()],
        });
        
        providers.push(AiProvider {
            id: "openai".to_string(),
            name: "GPT-4 (OpenAI)".to_string(),
            provider_type: "openai".to_string(),
            is_available: true,
            cost_per_token: 0.00003000,
            latency: 2000,
            specialties: vec!["general".to_string(), "creative".to_string()],
        });
        
        providers.push(AiProvider {
            id: "gemini".to_string(),
            name: "Gemini Pro (Google)".to_string(),
            provider_type: "gemini".to_string(),
            is_available: true,
            cost_per_token: 0.00000037, // 97% cheaper!
            latency: 800,
            specialties: vec!["fast".to_string(), "cost-effective".to_string()],
        });
        
        Ok(())
    }
    
    pub async fn create_chat_session(&self, project: ProjectContext) -> Result<String> {
        let session_id = uuid::Uuid::new_v4().to_string();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs();
            
        let session = ChatSession {
            id: session_id.clone(),
            name: format!("Chat - {}", project.root_path.split('/').last().unwrap_or("Project")),
            messages: Vec::new(),
            context: project,
            created_at: now,
            updated_at: now,
        };
        
        let mut sessions = self.chat_sessions.lock().await;
        sessions.insert(session_id.clone(), session);
        
        Ok(session_id)
    }
    
    pub async fn add_message_to_session(&self, session_id: &str, message: ChatMessage) -> Result<()> {
        let mut sessions = self.chat_sessions.lock().await;
        if let Some(session) = sessions.get_mut(session_id) {
            session.messages.push(message);
            session.updated_at = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_secs();
        }
        Ok(())
    }
}

// ================================
// TAURI COMMANDS (API Layer)
// ================================

#[tauri::command]
async fn initialize_app(state: State<'_, AppState>) -> Result<TauriResult<String>, String> {
    match state.initialize_ai_providers().await {
        Ok(_) => Ok(TauriResult {
            success: true,
            data: Some("App initialized successfully".to_string()),
            error: None,
        }),
        Err(e) => Ok(TauriResult {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

#[tauri::command]
async fn get_ai_providers(state: State<'_, AppState>) -> Result<TauriResult<Vec<AiProvider>>, String> {
    let providers = state.ai_providers.lock().await;
    Ok(TauriResult {
        success: true,
        data: Some(providers.clone()),
        error: None,
    })
}

// Native folder picker using Tauri dialog API
#[tauri::command]
async fn open_folder_dialog() -> Result<TauriResult<String>, String> {
    // For Tauri 2.0, we'll return a simple result
    // The frontend will handle the actual dialog via JavaScript API
    Ok(TauriResult {
        success: true,
        data: Some("dialog_trigger".to_string()),
        error: None,
    })
}

#[tauri::command]
async fn generate_ai_response(
    request: AiRequest,
    state: State<'_, AppState>,
) -> Result<TauriResult<ConsensusResult>, String> {
    tracing::info!("Generating AI response for request: {}", request.id);
    
    // Enhance the prompt with Context7 documentation if relevant libraries are detected
    let enhanced_prompt = enhance_prompt_with_context7(&request.prompt, &request.context).await;
    
    let enhanced_request = AiRequest {
        prompt: enhanced_prompt,
        ..request
    };
    
    // Select optimal AI provider for this request
    let provider = select_optimal_provider(&enhanced_request, &state).await;
    
    // Build the contextual prompt with project information
    let contextual_prompt = build_contextual_prompt(&enhanced_request);
    
    tracing::info!("Using provider: {} for request", provider);
    
    // Make the AI request
    match make_ai_request(&contextual_prompt, &provider).await {
        Ok(response) => {
            let ai_response = AiResponse {
                id: uuid::Uuid::new_v4().to_string(),
                request_id: enhanced_request.id.clone(),
                provider: provider.clone(),
                content: response.content,
                confidence: response.confidence,
                cost: response.cost,
                response_time: response.response_time,
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
            };
            
            // For now, return single response as consensus
            // TODO: Implement multi-provider consensus
            let consensus = ConsensusResult {
                best_response: ai_response.clone(),
                alternative_responses: vec![],
                confidence_score: ai_response.confidence,
                total_cost: ai_response.cost,
                reasoning: format!("Single provider response from {}", provider),
            };
            
            tracing::info!("AI response generated successfully with {} tokens", 
                contextual_prompt.len());
            
            Ok(TauriResult {
                success: true,
                data: Some(consensus),
                error: None,
            })
        }
        Err(e) => {
            tracing::error!("AI request failed: {:?}", e);
            Ok(TauriResult {
                success: false,
                data: None,
                error: Some(e.to_string()),
            })
        }
    }
}

#[tauri::command]
async fn open_project(path: String, state: State<'_, AppState>) -> Result<TauriResult<ProjectContext>, String> {
    // Enhanced project analysis logic with better error handling
    match analyze_project_structure(&path).await {
        Ok(project_context) => {
            // Store in app state
            let mut current_project = state.current_project.lock().await;
            *current_project = Some(project_context.clone());
            
            tracing::info!("Successfully opened project: {}", path);
            
            Ok(TauriResult {
                success: true,
                data: Some(project_context),
                error: None,
            })
        }
        Err(error) => {
            tracing::error!("Failed to open project {}: {:?}", path, error);
            
            // Provide more specific error messages
            let error_message = match error.to_string() {
                msg if msg.contains("Permission denied") => {
                    format!("Permission denied accessing folder: {}. Please check folder permissions and try again.", path)
                }
                msg if msg.contains("No such file or directory") => {
                    format!("Folder not found: {}. Please ensure the folder exists and try again.", path)
                }
                msg if msg.contains("Access is denied") => {
                    format!("Access denied to folder: {}. Please run with administrator privileges or choose a different folder.", path)
                }
                _ => {
                    format!("Failed to open project folder: {}. Error: {}", path, error)
                }
            };
            
            Ok(TauriResult {
                success: false,
                data: None,
                error: Some(error_message),
            })
        }
    }
}

#[tauri::command]
async fn create_chat_session(
    _project_path: String,
    state: State<'_, AppState>,
) -> Result<TauriResult<String>, String> {
    let current_project = state.current_project.lock().await;
    
    if let Some(project) = current_project.as_ref() {
        match state.create_chat_session(project.clone()).await {
            Ok(session_id) => Ok(TauriResult {
                success: true,
                data: Some(session_id),
                error: None,
            }),
            Err(e) => Ok(TauriResult {
                success: false,
                data: None,
                error: Some(e.to_string()),
            }),
        }
    } else {
        Ok(TauriResult {
            success: false,
            data: None,
            error: Some("No project loaded".to_string()),
        })
    }
}

#[tauri::command]
async fn send_chat_message(
    session_id: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<TauriResult<ChatMessage>, String> {
    let message_id = uuid::Uuid::new_v4().to_string();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let user_message = ChatMessage {
        id: message_id,
        message_type: "user".to_string(),
        content,
        timestamp: now,
        metadata: None,
    };
    
    // Add user message to session
    state.add_message_to_session(&session_id, user_message.clone()).await
        .map_err(|e| e.to_string())?;
    
    Ok(TauriResult {
        success: true,
        data: Some(user_message),
        error: None,
    })
}

#[tauri::command]
async fn get_chat_session(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<TauriResult<ChatSession>, String> {
    let sessions = state.chat_sessions.lock().await;
    
    if let Some(session) = sessions.get(&session_id) {
        Ok(TauriResult {
            success: true,
            data: Some(session.clone()),
            error: None,
        })
    } else {
        Ok(TauriResult {
            success: false,
            data: None,
            error: Some("Session not found".to_string()),
        })
    }
}

#[tauri::command]
async fn read_file(path: String) -> Result<TauriResult<String>, String> {
    match tokio::fs::read_to_string(&path).await {
        Ok(content) => Ok(TauriResult {
            success: true,
            data: Some(content),
            error: None,
        }),
        Err(e) => Ok(TauriResult {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

#[tauri::command]
async fn save_file(path: String, content: String) -> Result<TauriResult<String>, String> {
    match tokio::fs::write(&path, content).await {
        Ok(_) => Ok(TauriResult {
            success: true,
            data: Some("File saved successfully".to_string()),
            error: None,
        }),
        Err(e) => Ok(TauriResult {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

// ================================
// PERMISSION CHECKING COMMANDS
// ================================

#[tauri::command]
async fn check_folder_permissions(path: String) -> Result<TauriResult<bool>, String> {
    use std::fs;
    
    let project_path = PathBuf::from(&path);
    
    // Check if path exists
    if !project_path.exists() {
        return Ok(TauriResult {
            success: false,
            data: Some(false),
            error: Some(format!("Path does not exist: {}", path)),
        });
    }
    
    // Check if it's a directory
    if !project_path.is_dir() {
        return Ok(TauriResult {
            success: false,
            data: Some(false),
            error: Some(format!("Path is not a directory: {}", path)),
        });
    }
    
    // Try to read the directory
    match fs::read_dir(&project_path) {
        Ok(_) => {
            tracing::info!("Successfully verified read permissions for: {}", path);
            Ok(TauriResult {
                success: true,
                data: Some(true),
                error: None,
            })
        }
        Err(e) => {
            tracing::warn!("Permission check failed for {}: {}", path, e);
            let error_message = match e.kind() {
                std::io::ErrorKind::PermissionDenied => {
                    "Permission denied. Please run as administrator or choose a folder you have access to.".to_string()
                }
                std::io::ErrorKind::NotFound => {
                    "Folder not found. Please ensure the folder exists.".to_string()
                }
                _ => {
                    format!("Cannot access folder: {}", e)
                }
            };
            
            Ok(TauriResult {
                success: false,
                data: Some(false),
                error: Some(error_message),
            })
        }
    }
}

// Add missing commands for file explorer
#[tauri::command]
async fn get_directory_mtime(path: String) -> Result<TauriResult<u64>, String> {
    use std::fs;
    
    match fs::metadata(&path) {
        Ok(metadata) => {
            let mtime = metadata.modified()
                .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
                .unwrap_or(0);
            
            Ok(TauriResult {
                success: true,
                data: Some(mtime),
                error: None,
            })
        }
        Err(e) => {
            tracing::warn!("Failed to get directory mtime for {}: {}", path, e);
            Ok(TauriResult {
                success: false,
                data: Some(0),
                error: Some(format!("Cannot get directory modification time: {}", e)),
            })
        }
    }
}

// ================================
// UTILITY FUNCTIONS - Enhanced
// ================================

async fn analyze_project_structure(path: &str) -> Result<ProjectContext> {
    use std::fs;
    
    // First, verify the path exists and is accessible
    let project_path = PathBuf::from(path);
    
    if !project_path.exists() {
        return Err(anyhow::anyhow!("Path does not exist: {}", path));
    }
    
    if !project_path.is_dir() {
        return Err(anyhow::anyhow!("Path is not a directory: {}", path));
    }
    
    // Check if we can read the directory
    match fs::read_dir(&project_path) {
        Ok(_) => {},
        Err(e) => {
            return Err(anyhow::anyhow!("Cannot read directory {}: {}", path, e));
        }
    }
    
    // Enhanced project analysis - check if this is a project root or contains projects
    let mut actual_project_path = project_path.clone();
    let mut project_type = detect_project_type(&project_path).await
        .unwrap_or_else(|_| "unknown".to_string());
    
    // If not a known project type, look for projects in subdirectories
    if project_type == "unknown" {
        tracing::info!("Root folder is not a project, checking subdirectories...");
        
        // Check immediate subdirectories for projects
        if let Ok(entries) = fs::read_dir(&project_path) {
            for entry in entries.flatten() {
                if entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) {
                    let subdir_path = entry.path();
                    if let Ok(subdir_project_type) = detect_project_type(&subdir_path).await {
                        if subdir_project_type != "unknown" {
                            tracing::info!("Found {} project in: {}", subdir_project_type, subdir_path.display());
                            actual_project_path = subdir_path;
                            project_type = subdir_project_type;
                            break; // Use the first project found
                        }
                    }
                }
            }
        }
    }
    
    let dependencies = extract_dependencies(&actual_project_path, &project_type).await
        .unwrap_or_else(|_| vec![]);
    
    let git_branch = get_git_branch(&actual_project_path).await.ok();
    
    // Collect file information from the actual project path (or original if no project found)
    let open_files = collect_project_files(&project_path).await // Always collect from original path for full structure
        .unwrap_or_else(|_| vec![]);
    
    tracing::info!("Project analysis complete: {} files collected from {}", open_files.len(), path);
    
    Ok(ProjectContext {
        root_path: path.to_string(), // Keep original path as root
        project_type,
        open_files,
        dependencies,
        git_branch,
        active_framework: detect_framework(&actual_project_path).await.ok(),
    })
}

async fn detect_project_type(path: &PathBuf) -> Result<String> {
    // More comprehensive project type detection
    if path.join("Cargo.toml").exists() {
        Ok("rust".to_string())
    } else if path.join("package.json").exists() {
        // Check if it's TypeScript or JavaScript
        if path.join("tsconfig.json").exists() || 
           path.join("src").join("index.ts").exists() ||
           path.join("src").join("main.ts").exists() {
            Ok("typescript".to_string())
        } else {
            Ok("javascript".to_string())
        }
    } else if path.join("requirements.txt").exists() || 
              path.join("pyproject.toml").exists() || 
              path.join("setup.py").exists() {
        Ok("python".to_string())
    } else if path.join("pom.xml").exists() || 
              path.join("build.gradle").exists() {
        Ok("java".to_string())
    } else if path.join("Gemfile").exists() {
        Ok("ruby".to_string())
    } else if path.join("go.mod").exists() {
        Ok("go".to_string())
    } else if path.join("composer.json").exists() {
        Ok("php".to_string())
    } else {
        Ok("unknown".to_string())
    }
}

async fn extract_dependencies(path: &PathBuf, project_type: &str) -> Result<Vec<String>> {
    let mut dependencies = Vec::new();
    
    match project_type {
        "rust" => {
            if let Ok(cargo_content) = tokio::fs::read_to_string(path.join("Cargo.toml")).await {
                // Simple parsing - extract dependency names
                for line in cargo_content.lines() {
                    if line.contains("=") && !line.starts_with("#") && !line.contains("[") {
                        if let Some(dep_name) = line.split("=").next() {
                            dependencies.push(dep_name.trim().to_string());
                        }
                    }
                }
            }
        }
        "javascript" | "typescript" => {
            if let Ok(package_content) = tokio::fs::read_to_string(path.join("package.json")).await {
                // Simple JSON parsing for dependencies
                if let Ok(package_json) = serde_json::from_str::<serde_json::Value>(&package_content) {
                    if let Some(deps) = package_json.get("dependencies").and_then(|d| d.as_object()) {
                        dependencies.extend(deps.keys().cloned());
                    }
                    if let Some(dev_deps) = package_json.get("devDependencies").and_then(|d| d.as_object()) {
                        dependencies.extend(dev_deps.keys().cloned());
                    }
                }
            }
        }
        "python" => {
            if let Ok(req_content) = tokio::fs::read_to_string(path.join("requirements.txt")).await {
                for line in req_content.lines() {
                    if !line.trim().is_empty() && !line.starts_with("#") {
                        if let Some(dep) = line.split("==").next().or_else(|| line.split(">=").next()) {
                            dependencies.push(dep.trim().to_string());
                        }
                    }
                }
            }
        }
        _ => {}
    }
    
    Ok(dependencies)
}

async fn get_git_branch(path: &PathBuf) -> Result<String> {
    // Try to read git branch from .git/HEAD
    let git_head_path = path.join(".git").join("HEAD");
    if git_head_path.exists() {
        if let Ok(head_content) = tokio::fs::read_to_string(git_head_path).await {
            if head_content.starts_with("ref: refs/heads/") {
                return Ok(head_content.replace("ref: refs/heads/", "").trim().to_string());
            }
        }
    }
    Ok("main".to_string())
}

async fn detect_framework(path: &PathBuf) -> Result<String> {
    // Detect common frameworks
    if path.join("next.config.js").exists() || path.join("next.config.ts").exists() {
        Ok("Next.js".to_string())
    } else if path.join("nuxt.config.js").exists() || path.join("nuxt.config.ts").exists() {
        Ok("Nuxt.js".to_string())
    } else if path.join("angular.json").exists() {
        Ok("Angular".to_string())
    } else if path.join("vue.config.js").exists() {
        Ok("Vue.js".to_string())
    } else if path.join("svelte.config.js").exists() {
        Ok("Svelte".to_string())
    } else if path.join("Cargo.toml").exists() {
        // Check for Tauri
        if let Ok(cargo_content) = tokio::fs::read_to_string(path.join("Cargo.toml")).await {
            if cargo_content.contains("tauri") {
                return Ok("Tauri".to_string());
            }
        }
        Ok("Rust".to_string())
    } else {
        Ok("Generic".to_string())
    }
}

async fn collect_project_files(path: &PathBuf) -> Result<Vec<FileInfo>> {
    use std::fs;
    use walkdir::WalkDir;
    
    let mut files = Vec::new();
    let max_files = 200; // Increased limit for better project overview
    let mut file_count = 0;
    
    tracing::info!("Collecting files from: {}", path.display());
    
    // Walk directory with better depth and filtering
    for entry in WalkDir::new(path)
        .max_depth(5) // Increased depth for better traversal
        .into_iter()
        .filter_map(|e| {
            match e {
                Ok(entry) => Some(entry),
                Err(err) => {
                    tracing::warn!("Error accessing entry: {}", err);
                    None
                }
            }
        })
    {
        if file_count >= max_files {
            tracing::info!("Reached max file limit of {}", max_files);
            break;
        }
        
        let file_path = entry.path();
        let path_str = file_path.to_string_lossy();
        
        // Skip hidden files/directories (but allow .gitignore, .env, etc.)
        if let Some(filename) = file_path.file_name() {
            let filename_str = filename.to_string_lossy();
            if filename_str.starts_with('.') && 
               !filename_str.starts_with(".env") && 
               !filename_str.starts_with(".git") &&
               filename_str != ".gitignore" &&
               filename_str != ".gitattributes" {
                continue;
            }
        }
        
        // Skip common binary/generated directories (but be less aggressive)
        if path_str.contains("/target/release/") || 
           path_str.contains("/target/debug/") ||
           path_str.contains("/node_modules/") || 
           path_str.contains("/dist/build/") || 
           path_str.contains("/.git/objects/") ||
           path_str.contains("/build/release/") {
            continue;
        }
        
        // Include both files and directories
        if entry.file_type().is_file() || entry.file_type().is_dir() {
            if let Ok(metadata) = fs::metadata(file_path) {
                // Get file extension with dot prefix (empty for directories)
                let extension = if entry.file_type().is_dir() {
                    "".to_string()
                } else {
                    file_path.extension()
                        .map(|e| format!(".{}", e.to_string_lossy()))
                        .unwrap_or_else(|| "".to_string())
                };
                
                let file_info = FileInfo {
                    path: file_path.to_string_lossy().to_string(), // Store absolute path
                    name: file_path.file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_else(|| "unknown".to_string()),
                    extension: extension.clone(),
                    size: if entry.file_type().is_dir() { 0 } else { metadata.len() },
                    last_modified: metadata.modified()
                        .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
                        .unwrap_or(0),
                    content: None, // Don't load content immediately for performance
                    language: if entry.file_type().is_dir() { 
                        Some("directory".to_string()) 
                    } else { 
                        detect_language_from_extension(&extension) 
                    },
                };
                
                tracing::debug!("Added: {} ({})", file_info.name, if entry.file_type().is_dir() { "dir" } else { "file" });
                files.push(file_info);
                file_count += 1;
            }
        }
    }
    
    tracing::info!("Collected {} items from {}", files.len(), path.display());
    
    // Sort files: directories first, then files, alphabetically
    files.sort_by(|a, b| {
        // Directories first
        match (a.language.as_deref(), b.language.as_deref()) {
            (Some("directory"), Some("directory")) => a.name.cmp(&b.name),
            (Some("directory"), _) => std::cmp::Ordering::Less,
            (_, Some("directory")) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });
    
    Ok(files)
}

fn detect_language_from_extension(ext: &str) -> Option<String> {
    match ext.to_lowercase().as_str() {
        "rs" => Some("rust".to_string()),
        "ts" | "tsx" => Some("typescript".to_string()),
        "js" | "jsx" => Some("javascript".to_string()),
        "py" => Some("python".to_string()),
        "java" => Some("java".to_string()),
        "rb" => Some("ruby".to_string()),
        "go" => Some("go".to_string()),
        "php" => Some("php".to_string()),
        "c" => Some("c".to_string()),
        "cpp" | "cc" | "cxx" => Some("cpp".to_string()),
        "cs" => Some("csharp".to_string()),
        "html" => Some("html".to_string()),
        "css" => Some("css".to_string()),
        "json" => Some("json".to_string()),
        "xml" => Some("xml".to_string()),
        "md" => Some("markdown".to_string()),
        "yml" | "yaml" => Some("yaml".to_string()),
        "toml" => Some("toml".to_string()),
        "sh" => Some("shell".to_string()),
        _ => None,
    }
}

// ================================
// AI PROVIDER SELECTION LOGIC
// ================================

async fn select_optimal_provider(request: &AiRequest, state: &State<'_, AppState>) -> String {
    let _providers = state.ai_providers.lock().await;
    
    // Smart routing logic based on request characteristics
    let prompt_length = request.prompt.len();
    let has_code_context = request.context.is_some();
    
    // Route based on complexity and cost optimization
    if prompt_length < 100 && !has_code_context {
        // Simple queries go to fastest/cheapest provider
        "gemini".to_string()
    } else if prompt_length > 500 || has_code_context {
        // Complex queries go to most capable provider
        "claude".to_string()
    } else {
        // Medium queries go to balanced provider
        "openai".to_string()
    }
}

fn build_contextual_prompt(request: &AiRequest) -> String {
    let mut prompt = String::new();
    
    // Add system context
    prompt.push_str("You are Syntari AI Assistant, an expert software development AI. ");
    prompt.push_str("You help developers with code analysis, debugging, optimization, and explanations. ");
    prompt.push_str("Always provide practical, actionable advice.\n\n");
    
    // Add project context if available
    if let Some(context) = &request.context {
        prompt.push_str(&format!("PROJECT CONTEXT:\n"));
        prompt.push_str(&format!("- Project Type: {}\n", context.project_type));
        prompt.push_str(&format!("- Root Path: {}\n", context.root_path));
        prompt.push_str(&format!("- Open Files: {}\n", context.open_files.len()));
        
        if !context.dependencies.is_empty() {
            prompt.push_str(&format!("- Dependencies: {}\n", context.dependencies.join(", ")));
        }
        
        if let Some(branch) = &context.git_branch {
            prompt.push_str(&format!("- Git Branch: {}\n", branch));
        }
        
        prompt.push_str("\n");
    }
    
    // Add the user's actual request
    prompt.push_str("USER REQUEST:\n");
    prompt.push_str(&request.prompt);
    
    prompt
}

// ================================
// ACTUAL AI API INTEGRATION
// ================================

#[derive(Debug, Serialize, Deserialize)]
struct AiApiResponse {
    content: String,
    confidence: f64,
    cost: f64,
    response_time: u64,
}

async fn make_ai_request(prompt: &str, provider: &str) -> Result<AiApiResponse> {
    let start_time = std::time::Instant::now();
    
    match provider {
        "gemini" => make_gemini_request(prompt).await,
        "claude" => make_claude_request(prompt).await,
        "openai" => make_openai_request(prompt).await,
        _ => Err(anyhow::anyhow!("Unknown provider: {}", provider)),
    }.map(|mut response| {
        response.response_time = start_time.elapsed().as_millis() as u64;
        response
    })
}

async fn make_gemini_request(prompt: &str) -> Result<AiApiResponse> {
    // TODO: Replace with your actual Gemini API key
    let api_key = std::env::var("GEMINI_API_KEY")
        .unwrap_or_else(|_| "your-gemini-api-key".to_string());
    
    let client = reqwest::Client::new();
    let response = client
        .post("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent")
        .header("Content-Type", "application/json")
        .query(&[("key", api_key)])
        .json(&json!({
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2000
            }
        }))
        .send()
        .await
        .context("Failed to send Gemini request")?;
    
    let json_response: serde_json::Value = response.json().await
        .context("Failed to parse Gemini response")?;
    
    let content = json_response["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("I apologize, but I couldn't generate a response.")
        .to_string();
    
    Ok(AiApiResponse {
        content,
        confidence: 0.85,
        cost: 0.00000037, // Gemini Pro pricing
        response_time: 0, // Will be set by caller
    })
}

async fn make_claude_request(prompt: &str) -> Result<AiApiResponse> {
    // TODO: Replace with your actual Anthropic API key
    let api_key = std::env::var("ANTHROPIC_API_KEY")
        .unwrap_or_else(|_| "your-anthropic-api-key".to_string());
    
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("Content-Type", "application/json")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&json!({
            "model": "claude-3-sonnet-20240229",
            "max_tokens": 2000,
            "messages": [{
                "role": "user",
                "content": prompt
            }]
        }))
        .send()
        .await
        .context("Failed to send Claude request")?;
    
    let json_response: serde_json::Value = response.json().await
        .context("Failed to parse Claude response")?;
    
    let content = json_response["content"][0]["text"]
        .as_str()
        .unwrap_or("I apologize, but I couldn't generate a response.")
        .to_string();
    
    Ok(AiApiResponse {
        content,
        confidence: 0.95,
        cost: 0.00001102, // Claude Sonnet pricing
        response_time: 0, // Will be set by caller
    })
}

async fn make_openai_request(prompt: &str) -> Result<AiApiResponse> {
    // TODO: Replace with your actual OpenAI API key
    let api_key = std::env::var("OPENAI_API_KEY")
        .unwrap_or_else(|_| "your-openai-api-key".to_string());
    
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&json!({
            "model": "gpt-4",
            "messages": [{
                "role": "user",
                "content": prompt
            }],
            "max_tokens": 2000,
            "temperature": 0.7
        }))
        .send()
        .await
        .context("Failed to send OpenAI request")?;
    
    let json_response: serde_json::Value = response.json().await
        .context("Failed to parse OpenAI response")?;
    
    let content = json_response["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("I apologize, but I couldn't generate a response.")
        .to_string();
    
    Ok(AiApiResponse {
        content,
        confidence: 0.90,
        cost: 0.00003000, // GPT-4 pricing
        response_time: 0, // Will be set by caller
    })
}

// ================================
// CONTEXT7 MCP INTEGRATION
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Context7LibraryResult {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub documentation_coverage: Option<u32>,
    pub trust_score: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Context7DocsResult {
    pub library_id: String,
    pub content: String,
    pub tokens_used: u32,
    pub topic_focused: Option<String>,
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

#[tauri::command]
async fn resolve_library_id(library_name: String) -> Result<TauriResult<Vec<Context7LibraryResult>>, String> {
    tracing::info!("Resolving library ID for: {}", library_name);
    
    let client = reqwest::Client::new();
    
    // Call Context7 MCP resolve-library-id endpoint
    let response = client
        .post("https://mcp.context7.com/mcp/resolve-library-id")
        .json(&json!({
            "libraryName": library_name
        }))
        .send()
        .await;
    
    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                match resp.json::<serde_json::Value>().await {
                    Ok(json_data) => {
                        // Parse the response and extract library results
                        let mut results = Vec::new();
                        
                        if let Some(libraries) = json_data.get("results").and_then(|r| r.as_array()) {
                            for lib in libraries {
                                if let (Some(id), Some(name)) = (
                                    lib.get("id").and_then(|i| i.as_str()),
                                    lib.get("name").and_then(|n| n.as_str())
                                ) {
                                    results.push(Context7LibraryResult {
                                        id: id.to_string(),
                                        name: name.to_string(),
                                        description: lib.get("description").and_then(|d| d.as_str()).map(|s| s.to_string()),
                                        documentation_coverage: lib.get("coverage").and_then(|c| c.as_u64()).map(|c| c as u32),
                                        trust_score: lib.get("trust_score").and_then(|t| t.as_u64()).map(|t| t as u32),
                                    });
                                }
                            }
                        }
                        
                        Ok(TauriResult {
                            success: true,
                            data: Some(results),
                            error: None,
                        })
                    }
                    Err(e) => Ok(TauriResult {
                        success: false,
                        data: None,
                        error: Some(format!("Failed to parse Context7 response: {}", e)),
                    })
                }
            } else {
                Ok(TauriResult {
                    success: false,
                    data: None,
                    error: Some(format!("Context7 API error: {}", resp.status())),
                })
            }
        }
        Err(e) => Ok(TauriResult {
            success: false,
            data: None,
            error: Some(format!("Failed to connect to Context7 MCP: {}", e)),
        })
    }
}

#[tauri::command]
async fn get_library_docs(
    context7_compatible_library_id: String,
    topic: Option<String>,
    tokens: Option<u32>
) -> Result<TauriResult<Context7DocsResult>, String> {
    tracing::info!("Getting library docs for: {} (topic: {:?})", context7_compatible_library_id, topic);
    
    let client = reqwest::Client::new();
    let max_tokens = tokens.unwrap_or(10000);
    
    let mut payload = json!({
        "context7CompatibleLibraryID": context7_compatible_library_id,
        "tokens": max_tokens
    });
    
    if let Some(topic_str) = topic {
        payload["topic"] = json!(topic_str);
    }
    
    // Call Context7 MCP get-library-docs endpoint
    let response = client
        .post("https://mcp.context7.com/mcp/get-library-docs")
        .json(&payload)
        .send()
        .await;
    
    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                match resp.json::<serde_json::Value>().await {
                    Ok(json_data) => {
                        if let (Some(content), Some(library_id)) = (
                            json_data.get("content").and_then(|c| c.as_str()),
                            json_data.get("libraryId").and_then(|l| l.as_str())
                        ) {
                            let docs_result = Context7DocsResult {
                                library_id: library_id.to_string(),
                                content: content.to_string(),
                                tokens_used: json_data.get("tokensUsed").and_then(|t| t.as_u64()).unwrap_or(0) as u32,
                                topic_focused: json_data.get("topicFocused").and_then(|t| t.as_str()).map(|s| s.to_string()),
                            };
                            
                            Ok(TauriResult {
                                success: true,
                                data: Some(docs_result),
                                error: None,
                            })
                        } else {
                            Ok(TauriResult {
                                success: false,
                                data: None,
                                error: Some("Invalid response format from Context7".to_string()),
                            })
                        }
                    }
                    Err(e) => Ok(TauriResult {
                        success: false,
                        data: None,
                        error: Some(format!("Failed to parse Context7 docs response: {}", e)),
                    })
                }
            } else {
                Ok(TauriResult {
                    success: false,
                    data: None,
                    error: Some(format!("Context7 docs API error: {}", resp.status())),
                })
            }
        }
        Err(e) => Ok(TauriResult {
            success: false,
            data: None,
            error: Some(format!("Failed to connect to Context7 docs API: {}", e)),
        })
    }
}

// ================================
// AI REQUEST WITH CONTEXT7 ENHANCEMENT
// ================================

async fn enhance_prompt_with_context7(prompt: &str, project_context: &Option<ProjectContext>) -> String {
    let mut enhanced_prompt = prompt.to_string();
    
    // Extract potential library names from the prompt and project dependencies
    let mut libraries_to_query = Vec::new();
    
    // Check project dependencies if available
    if let Some(project) = project_context {
        for dep in &project.dependencies {
            if prompt.to_lowercase().contains(&dep.to_lowercase()) {
                libraries_to_query.push(dep.clone());
            }
        }
        
        // Add framework-specific documentation
        if let Some(framework) = &project.active_framework {
            if prompt.to_lowercase().contains(&framework.to_lowercase()) {
                libraries_to_query.push(framework.clone());
            }
        }
    }
    
    // Query Context7 for relevant documentation
    for library in libraries_to_query.iter().take(3) { // Limit to 3 libraries to avoid excessive tokens
        if let Ok(docs_result) = get_library_docs(
            format!("/{}", library.to_lowercase()),
            Some("api".to_string()),
            Some(2000)
        ).await {
            if let Some(docs) = docs_result.data {
                enhanced_prompt.push_str(&format!(
                    "\n\n=== {} Documentation Context ===\n{}\n",
                    library,
                    docs.content
                ));
            }
        }
    }
    
    enhanced_prompt
}

#[tauri::command]
async fn scan_directories_only(
    path: String, 
    max_depth: Option<u32>, 
    ignore_patterns: Option<Vec<String>>
) -> Result<TauriResult<Vec<DirectoryInfo>>, String> {
    use std::fs;
    use walkdir::WalkDir;
    
    let max_depth = max_depth.unwrap_or(3);
    let ignore_patterns = ignore_patterns.unwrap_or_else(|| vec![
        ".git".to_string(), 
        "node_modules".to_string(), 
        ".DS_Store".to_string(), 
        "target".to_string()
    ]);
    
    tracing::info!("Scanning directories only in: {} (max depth: {})", path, max_depth);
    
    let mut directories = Vec::new();
    let project_path = PathBuf::from(&path);
    
    for entry in WalkDir::new(&project_path)
        .max_depth(max_depth as usize)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if !entry.file_type().is_dir() {
            continue;
        }
        
        let dir_path = entry.path();
        let path_str = dir_path.to_string_lossy();
        
        // Skip ignored patterns
        let should_ignore = ignore_patterns.iter().any(|pattern| {
            dir_path.file_name()
                .map(|name| name.to_string_lossy().contains(pattern))
                .unwrap_or(false)
        });
        
        if should_ignore {
            continue;
        }
        
        if let Ok(metadata) = fs::metadata(dir_path) {
            let depth = dir_path.components().count() - project_path.components().count();
            let last_modified = metadata.modified()
                .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
                .unwrap_or(0);
            
            directories.push(DirectoryInfo {
                path: path_str.to_string(),
                name: dir_path.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "unknown".to_string()),
                depth: depth as u32,
                last_modified,
            });
        }
    }
    
    tracing::info!("Found {} directories", directories.len());
    
    Ok(TauriResult {
        success: true,
        data: Some(directories),
        error: None,
    })
}

#[tauri::command]
async fn scan_files_chunked(
    path: String,
    offset: usize,
    limit: usize,
    ignore_patterns: Option<Vec<String>>,
    include_hidden: Option<bool>
) -> Result<TauriResult<ScanFilesResult>, String> {
    use std::fs;
    use walkdir::WalkDir;
    
    let ignore_patterns = ignore_patterns.unwrap_or_else(|| vec![
        ".git".to_string(), 
        "node_modules".to_string(), 
        ".DS_Store".to_string(), 
        "target".to_string()
    ]);
    let include_hidden = include_hidden.unwrap_or(false);
    
    tracing::info!("Scanning files in: {} (offset: {}, limit: {})", path, offset, limit);
    
    let project_path = PathBuf::from(&path);
    let mut all_files = Vec::new();
    
    // Collect all files first (we can optimize this later with streaming)
    for entry in WalkDir::new(&project_path)
        .max_depth(5)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if !entry.file_type().is_file() {
            continue;
        }
        
        let file_path = entry.path();
        let path_str = file_path.to_string_lossy();
        
        // Skip hidden files unless requested
        if !include_hidden {
            if let Some(filename) = file_path.file_name() {
                let filename_str = filename.to_string_lossy();
                if filename_str.starts_with('.') && 
                   !filename_str.starts_with(".env") && 
                   !filename_str.starts_with(".git") &&
                   filename_str != ".gitignore" &&
                   filename_str != ".gitattributes" {
                    continue;
                }
            }
        }
        
        // Skip ignored patterns
        let should_ignore = ignore_patterns.iter().any(|pattern| {
            path_str.contains(&format!("/{}/", pattern)) || 
            path_str.contains(&format!("\\{}\\", pattern))
        });
        
        if should_ignore {
            continue;
        }
        
        if let Ok(metadata) = fs::metadata(file_path) {
            let depth = file_path.components().count() - project_path.components().count();
            let extension = file_path.extension()
                .map(|e| format!(".{}", e.to_string_lossy()))
                .unwrap_or_else(|| "".to_string());
            
            let last_modified = metadata.modified()
                .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
                .unwrap_or(0);
            
            all_files.push(FileInfoChunk {
                path: path_str.to_string(),
                name: file_path.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "unknown".to_string()),
                depth: depth as u32,
                size: metadata.len(),
                last_modified,
                extension,
            });
        }
    }
    
    // Return the requested chunk
    let end_index = std::cmp::min(offset + limit, all_files.len());
    let chunk = if offset < all_files.len() {
        all_files[offset..end_index].to_vec()
    } else {
        Vec::new()
    };
    
    let has_more = end_index < all_files.len();
    
    tracing::info!("Returning {} files (chunk {}-{} of {})", chunk.len(), offset, end_index, all_files.len());
    
    Ok(TauriResult {
        success: true,
        data: Some(ScanFilesResult {
            files: chunk,
            has_more,
        }),
        error: None,
    })
}

// ================================
// TAURI APPLICATION SETUP
// ================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Setup logic and developer tools for debug builds
            tracing::info!("Syntari AI IDE starting up...");
            
            #[cfg(debug_assertions)] // Only enable devtools in debug builds
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                    tracing::info!("Developer tools opened automatically for window: {}", window.label());
                }
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            initialize_app,
            get_ai_providers,
            generate_ai_response,
            open_project,
            create_chat_session,
            send_chat_message,
            get_chat_session,
            read_file,
            save_file,
            open_folder_dialog,
            check_folder_permissions,
            resolve_library_id,
            get_library_docs,
            get_directory_mtime,
            scan_directories_only,
            scan_files_chunked,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

