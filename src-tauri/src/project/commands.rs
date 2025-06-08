// Syntari AI IDE - Project Commands
// Project-related commands exposed to the frontend

use tauri::State;
use std::path::Path;
use crate::core::{AppState, TauriResult, FileInfo, create_file_info_with_content, validate_directory};
use crate::project::types::{ProjectContext, ProjectType, Framework};

#[tauri::command]
pub async fn open_project(path: String, state: State<'_, AppState>) -> std::result::Result<TauriResult<ProjectContext>, String> {
    tracing::info!("Opening project at: {}", path);
    
    let project_path = Path::new(&path);
    
    // Validate directory using shared utility
    if let Err(e) = validate_directory(project_path) {
        tracing::warn!("Project validation failed: {:?}", e);
        return Ok(TauriResult::error(e.message().to_string()));
    }
    
    // Analyze project structure
    let project_type = detect_project_type(project_path).await;
    let framework = detect_framework(project_path).await;
    let git_branch = detect_git_branch(project_path).await;
    let dependencies = detect_dependencies(project_path, &project_type).await;
    
    // Read some initial files for context using shared utility
    let open_files = read_initial_project_files(project_path, &project_type).await;
    
    // Create project context
    let mut project_context = ProjectContext::new(
        path.clone(),
        project_type.to_string(),
    );
    
    project_context = project_context
        .with_files(open_files)
        .with_dependencies(dependencies);
    
    if let Some(branch) = git_branch {
        project_context = project_context.with_git_branch(branch);
    }
    
    if let Some(fw) = framework {
        project_context = project_context.with_framework(fw.to_string());
    }
    
    // Update application state
    if let Err(e) = state.set_current_project(project_context.clone()).await {
        tracing::error!("Failed to update application state: {:?}", e);
        return Ok(TauriResult::error("Failed to update application state".to_string()));
    }
    
    tracing::info!("Successfully opened project: {} (type: {})", path, project_type.to_string());
    Ok(TauriResult::success(project_context))
}

async fn detect_project_type(project_path: &Path) -> ProjectType {
    // Check for common project files
    let indicators = [
        ("Cargo.toml", ProjectType::Rust),
        ("package.json", ProjectType::JavaScript), // Will be refined by framework detection
        ("requirements.txt", ProjectType::Python),
        ("pyproject.toml", ProjectType::Python),
        ("pom.xml", ProjectType::Java),
        ("build.gradle", ProjectType::Java),
        ("go.mod", ProjectType::Go),
        ("composer.json", ProjectType::PHP),
        ("Gemfile", ProjectType::Ruby),
        ("*.csproj", ProjectType::CSharp),
        ("*.sln", ProjectType::CSharp),
    ];
    
    for (indicator, project_type) in &indicators {
        if indicator.contains('*') {
            // Handle glob patterns
            let pattern = indicator.trim_start_matches('*');
            if let Ok(entries) = std::fs::read_dir(project_path) {
                for entry in entries.flatten() {
                    if let Some(name) = entry.file_name().to_str() {
                        if name.ends_with(pattern) {
                            tracing::debug!("Detected project type {:?} via pattern {}", project_type, indicator);
                            return *project_type;
                        }
                    }
                }
            }
        } else {
            let file_path = project_path.join(indicator);
            if file_path.exists() {
                tracing::debug!("Detected project type {:?} via file {}", project_type, indicator);
                
                // Special case for package.json - check for TypeScript
                if *indicator == "package.json" {
                    if project_path.join("tsconfig.json").exists() {
                        return ProjectType::TypeScript;
                    }
                }
                
                return *project_type;
            }
        }
    }
    
    tracing::debug!("Could not detect project type, defaulting to Unknown");
    ProjectType::Unknown
}

async fn detect_framework(project_path: &Path) -> Option<Framework> {
    // Check package.json for JS/TS frameworks
    let package_json_path = project_path.join("package.json");
    if package_json_path.exists() {
        if let Ok(content) = tokio::fs::read_to_string(&package_json_path).await {
            if let Ok(package_json) = serde_json::from_str::<serde_json::Value>(&content) {
                // Check dependencies for framework indicators
                let deps = package_json.get("dependencies")
                    .or_else(|| package_json.get("devDependencies"))
                    .and_then(|d| d.as_object());
                
                if let Some(dependencies) = deps {
                    if dependencies.contains_key("next") {
                        return Some(Framework::NextJs);
                    }
                    if dependencies.contains_key("react") {
                        return Some(Framework::React);
                    }
                    if dependencies.contains_key("vue") {
                        return Some(Framework::Vue);
                    }
                    if dependencies.contains_key("@angular/core") {
                        return Some(Framework::Angular);
                    }
                    if dependencies.contains_key("svelte") {
                        return Some(Framework::Svelte);
                    }
                    if dependencies.contains_key("nuxt") {
                        return Some(Framework::Nuxt);
                    }
                    if dependencies.contains_key("express") {
                        return Some(Framework::Express);
                    }
                }
            }
        }
    }
    
    // Check for Tauri
    if project_path.join("src-tauri").exists() {
        return Some(Framework::Tauri);
    }
    
    // Check for Python frameworks
    let requirements_path = project_path.join("requirements.txt");
    if requirements_path.exists() {
        if let Ok(content) = tokio::fs::read_to_string(&requirements_path).await {
            if content.contains("Django") {
                return Some(Framework::Django);
            }
            if content.contains("Flask") {
                return Some(Framework::Flask);
            }
        }
    }
    
    // Check for Java frameworks
    let pom_path = project_path.join("pom.xml");
    if pom_path.exists() {
        if let Ok(content) = tokio::fs::read_to_string(&pom_path).await {
            if content.contains("spring-boot") {
                return Some(Framework::SpringBoot);
            }
        }
    }
    
    None
}

async fn detect_git_branch(project_path: &Path) -> Option<String> {
    let git_head_path = project_path.join(".git").join("HEAD");
    if git_head_path.exists() {
        if let Ok(content) = tokio::fs::read_to_string(&git_head_path).await {
            let content = content.trim();
            if content.starts_with("ref: refs/heads/") {
                let branch = content.strip_prefix("ref: refs/heads/")?;
                return Some(branch.to_string());
            }
        }
    }
    None
}

async fn detect_dependencies(project_path: &Path, project_type: &ProjectType) -> Vec<String> {
    let mut dependencies = Vec::new();
    
    match project_type {
        ProjectType::Rust => {
            let cargo_path = project_path.join("Cargo.toml");
            if let Ok(content) = tokio::fs::read_to_string(&cargo_path).await {
                // Parse basic TOML structure for dependencies
                let lines: Vec<&str> = content.lines().collect();
                let mut in_dependencies = false;
                
                for line in lines {
                    let line = line.trim();
                    if line == "[dependencies]" {
                        in_dependencies = true;
                        continue;
                    }
                    if line.starts_with('[') && line != "[dependencies]" {
                        in_dependencies = false;
                        continue;
                    }
                    if in_dependencies && line.contains('=') {
                        if let Some(dep_name) = line.split('=').next() {
                            dependencies.push(dep_name.trim().trim_matches('"').to_string());
                        }
                    }
                }
            }
        }
        ProjectType::JavaScript | ProjectType::TypeScript => {
            let package_json_path = project_path.join("package.json");
            if let Ok(content) = tokio::fs::read_to_string(&package_json_path).await {
                if let Ok(package_json) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(deps) = package_json.get("dependencies").and_then(|d| d.as_object()) {
                        dependencies.extend(deps.keys().cloned());
                    }
                    if let Some(dev_deps) = package_json.get("devDependencies").and_then(|d| d.as_object()) {
                        dependencies.extend(dev_deps.keys().cloned());
                    }
                }
            }
        }
        ProjectType::Python => {
            let requirements_path = project_path.join("requirements.txt");
            if let Ok(content) = tokio::fs::read_to_string(&requirements_path).await {
                for line in content.lines() {
                    let line = line.trim();
                    if !line.is_empty() && !line.starts_with('#') {
                        if let Some(dep_name) = line.split('=').next().or_else(|| line.split('>').next()) {
                            dependencies.push(dep_name.trim().to_string());
                        }
                    }
                }
            }
        }
        _ => {
            // For other project types, we could add more detection logic
        }
    }
    
    dependencies
}

async fn read_initial_project_files(project_path: &Path, project_type: &ProjectType) -> Vec<FileInfo> {
    let mut files = Vec::new();
    
    // Define files to read based on project type
    let files_to_read = match project_type {
        ProjectType::Rust => vec!["Cargo.toml", "README.md", "src/main.rs", "src/lib.rs"],
        ProjectType::JavaScript | ProjectType::TypeScript => vec!["package.json", "README.md", "index.js", "index.ts", "src/index.js", "src/index.ts"],
        ProjectType::Python => vec!["requirements.txt", "README.md", "main.py", "app.py", "setup.py"],
        ProjectType::Java => vec!["pom.xml", "build.gradle", "README.md"],
        ProjectType::Go => vec!["go.mod", "go.sum", "README.md", "main.go"],
        _ => vec!["README.md"],
    };
    
    for file_name in files_to_read {
        let file_path = project_path.join(file_name);
        if file_path.exists() && file_path.is_file() {
            // Use shared file utility instead of duplicated logic
            match create_file_info_with_content(&file_path, true).await {
                Ok(file_info) => {
                    files.push(file_info);
                }
                Err(e) => {
                    tracing::warn!("Failed to read project file {}: {:?}", file_name, e);
                    // Continue processing other files
                }
            }
        }
    }
    
    files
} 