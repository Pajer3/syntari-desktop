// Syntari AI IDE - Project Domain Types
// Data structures for project analysis and management

use serde::{Deserialize, Serialize};
use crate::core::FileInfo;

// ================================
// PROJECT CONTEXT TYPES
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectContext {
    pub root_path: String,
    pub project_type: String,
    pub open_files: Vec<FileInfo>,
    pub dependencies: Vec<String>,
    pub git_branch: Option<String>,
    pub active_framework: Option<String>,
}

impl ProjectContext {
    pub fn new(root_path: impl Into<String>, project_type: impl Into<String>) -> Self {
        Self {
            root_path: root_path.into(),
            project_type: project_type.into(),
            open_files: Vec::new(),
            dependencies: Vec::new(),
            git_branch: None,
            active_framework: None,
        }
    }
    
    pub fn with_files(mut self, files: Vec<FileInfo>) -> Self {
        self.open_files = files;
        self
    }
    
    pub fn with_dependencies(mut self, dependencies: Vec<String>) -> Self {
        self.dependencies = dependencies;
        self
    }
    
    pub fn with_git_branch(mut self, branch: impl Into<String>) -> Self {
        self.git_branch = Some(branch.into());
        self
    }
    
    pub fn with_framework(mut self, framework: impl Into<String>) -> Self {
        self.active_framework = Some(framework.into());
        self
    }
    
    pub fn file_count(&self) -> usize {
        self.open_files.len()
    }
    
    pub fn has_framework(&self) -> bool {
        self.active_framework.is_some()
    }
    
    pub fn is_git_repository(&self) -> bool {
        self.git_branch.is_some()
    }
}

// ================================
// PROJECT ANALYSIS TYPES
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectAnalysis {
    pub context: ProjectContext,
    pub complexity_score: f64,
    pub language_distribution: std::collections::HashMap<String, u32>,
    pub framework_confidence: f64,
    pub suggested_improvements: Vec<String>,
}

impl ProjectAnalysis {
    pub fn new(context: ProjectContext) -> Self {
        Self {
            context,
            complexity_score: 0.0,
            language_distribution: std::collections::HashMap::new(),
            framework_confidence: 0.0,
            suggested_improvements: Vec::new(),
        }
    }
}

// ================================
// PROJECT TYPE DETECTION
// ================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProjectType {
    Rust,
    JavaScript,
    TypeScript,
    Python,
    Java,
    Go,
    PHP,
    Ruby,
    CSharp,
    Unknown,
}

impl ProjectType {
    pub fn from_string(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "rust" => Self::Rust,
            "javascript" => Self::JavaScript,
            "typescript" => Self::TypeScript,
            "python" => Self::Python,
            "java" => Self::Java,
            "go" => Self::Go,
            "php" => Self::PHP,
            "ruby" => Self::Ruby,
            "csharp" | "c#" => Self::CSharp,
            _ => Self::Unknown,
        }
    }
    
    pub fn to_string(&self) -> &'static str {
        match self {
            Self::Rust => "rust",
            Self::JavaScript => "javascript",
            Self::TypeScript => "typescript",
            Self::Python => "python",
            Self::Java => "java",
            Self::Go => "go",
            Self::PHP => "php",
            Self::Ruby => "ruby",
            Self::CSharp => "csharp",
            Self::Unknown => "unknown",
        }
    }
    
    pub fn typical_extensions(&self) -> Vec<&'static str> {
        match self {
            Self::Rust => vec!["rs", "toml"],
            Self::JavaScript => vec!["js", "jsx", "json"],
            Self::TypeScript => vec!["ts", "tsx", "json"],
            Self::Python => vec!["py", "pyw", "txt", "toml"],
            Self::Java => vec!["java", "xml", "gradle"],
            Self::Go => vec!["go", "mod", "sum"],
            Self::PHP => vec!["php", "json"],
            Self::Ruby => vec!["rb", "gemfile"],
            Self::CSharp => vec!["cs", "csproj", "sln"],
            Self::Unknown => vec![],
        }
    }
}

// ================================
// FRAMEWORK DETECTION
// ================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Framework {
    NextJs,
    React,
    Vue,
    Angular,
    Svelte,
    Nuxt,
    Tauri,
    Express,
    Django,
    Flask,
    SpringBoot,
    Generic,
}

impl Framework {
    pub fn from_string(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "next.js" | "nextjs" => Self::NextJs,
            "react" => Self::React,
            "vue.js" | "vue" => Self::Vue,
            "angular" => Self::Angular,
            "svelte" => Self::Svelte,
            "nuxt.js" | "nuxt" => Self::Nuxt,
            "tauri" => Self::Tauri,
            "express" => Self::Express,
            "django" => Self::Django,
            "flask" => Self::Flask,
            "spring boot" | "springboot" => Self::SpringBoot,
            _ => Self::Generic,
        }
    }
    
    pub fn to_string(&self) -> &'static str {
        match self {
            Self::NextJs => "Next.js",
            Self::React => "React",
            Self::Vue => "Vue.js",
            Self::Angular => "Angular",
            Self::Svelte => "Svelte",
            Self::Nuxt => "Nuxt.js",
            Self::Tauri => "Tauri",
            Self::Express => "Express",
            Self::Django => "Django",
            Self::Flask => "Flask",
            Self::SpringBoot => "Spring Boot",
            Self::Generic => "Generic",
        }
    }
} 