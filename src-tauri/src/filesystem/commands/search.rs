// Syntari AI IDE - Search Commands
// Project-wide search functionality

use std::path::Path;
use std::collections::HashSet;
use crate::core::types::TauriResult;
use ignore::WalkBuilder;
use regex::Regex;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct SearchOptions {
    #[serde(rename = "caseSensitive")]
    case_sensitive: bool,
    #[serde(rename = "wholeWord")]
    whole_word: bool,
    #[serde(rename = "useRegex")]
    use_regex: bool,
    #[serde(rename = "includeFileTypes")]
    include_file_types: Vec<String>,
    #[serde(rename = "excludeFileTypes")]
    exclude_file_types: Vec<String>,
    #[serde(rename = "excludeDirectories")]
    exclude_directories: Vec<String>,
}

#[derive(serde::Serialize)]
pub struct SearchMatch {
    file: String,
    line: u32,
    column: u32,
    text: String,
    #[serde(rename = "matchStart")]
    match_start: u32,
    #[serde(rename = "matchEnd")]
    match_end: u32,
}

#[derive(serde::Serialize)]
pub struct SearchResult {
    file: String,
    matches: Vec<SearchMatch>,
    #[serde(rename = "totalMatches")]
    total_matches: u32,
}

#[derive(serde::Serialize)]
pub struct SearchData {
    results: Vec<SearchResult>,
    #[serde(rename = "totalMatches")]
    total_matches: u32,
    #[serde(rename = "filesSearched")]
    files_searched: u32,
    #[serde(rename = "totalFiles")]
    total_files: u32,
}

/// Search in project with advanced options
#[tauri::command]
pub async fn search_in_project(
    project_path: String,
    query: String,
    options: SearchOptions,
) -> std::result::Result<TauriResult<SearchData>, String> {
    tracing::debug!("Starting project search: {} in {}", query, project_path);
    
    if query.trim().is_empty() {
        return Ok(TauriResult::error("Search query cannot be empty".to_string()));
    }
    
    let project_path = Path::new(&project_path);
    if !project_path.exists() || !project_path.is_dir() {
        return Ok(TauriResult::error("Invalid project path".to_string()));
    }
    
    // Build search regex
    let search_regex = build_search_regex(&query, &options)?;
    
    // Convert file type filters to sets for faster lookup
    let include_types: HashSet<_> = options.include_file_types.iter().map(|s| s.as_str()).collect();
    let exclude_types: HashSet<_> = options.exclude_file_types.iter().map(|s| s.as_str()).collect();
    let exclude_dirs: HashSet<_> = options.exclude_directories.iter().map(|s| s.as_str()).collect();
    
    // Use ignore crate for gitignore support and better performance
    let mut builder = WalkBuilder::new(project_path);
    builder
        .hidden(false) // Include hidden files for now
        .git_ignore(true)
        .git_exclude(true)
        .git_global(true)
        .max_depth(Some(20)); // Reasonable depth limit
    
    let walker = builder.build();
    
    let mut results = Vec::new();
    let mut total_matches = 0;
    let mut files_searched = 0;
    let mut total_files = 0;
    
    // Count total files first (for progress)
    for entry in builder.build() {
        if let Ok(entry) = entry {
            if entry.path().is_file() {
                total_files += 1;
            }
        }
    }
    
    // Perform search
    for entry in walker {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        
        let path = entry.path();
        
        // Skip directories
        if !path.is_file() {
            continue;
        }
        
        // Check excluded directories
        if let Some(parent) = path.parent() {
            if exclude_dirs.iter().any(|&dir| parent.to_string_lossy().contains(dir)) {
                continue;
            }
        }
        
        // Check file extension filters
        if let Some(extension) = path.extension().and_then(|ext| ext.to_str()) {
            let ext_with_dot = format!(".{}", extension);
            
            // If include filters are specified, file must match one of them
            if !include_types.is_empty() && !include_types.contains(ext_with_dot.as_str()) {
                continue;
            }
            
            // Skip if file matches exclude filter
            if exclude_types.contains(ext_with_dot.as_str()) {
                continue;
            }
        }
        
        files_searched += 1;
        
        // Read and search file content
        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue, // Skip binary files or files we can't read
        };
        
        let file_matches = search_in_content(&content, &search_regex, path);
        let matches_count = file_matches.len();
        
        // Add file result if matches found
        if !file_matches.is_empty() {
            total_matches += matches_count as u32;
            let file_result = SearchResult {
                file: path.to_string_lossy().to_string(),
                total_matches: matches_count as u32,
                matches: file_matches,
            };
            results.push(file_result);
        }
        
        // Prevent excessive memory usage for very large searches
        if total_matches > 10000 {
            tracing::warn!("Search stopped at 10,000 matches to prevent memory issues");
            break;
        }
    }
    
    let search_data = SearchData {
        results,
        total_matches,
        files_searched,
        total_files,
    };
    
    tracing::debug!(
        "Search completed: {} matches in {} files (searched {} of {} files)",
        total_matches, search_data.results.len(), files_searched, total_files
    );
    
    Ok(TauriResult::success(search_data))
}

/// Streaming/chunked search for better performance
#[tauri::command]
pub async fn search_in_project_streaming(
    project_path: String,
    query: String,
    options: SearchOptions,
    max_results: Option<u32>,
) -> std::result::Result<TauriResult<SearchData>, String> {
    tracing::info!("Starting streaming search in project: {} for query: {}", project_path, query);
    
    if query.trim().is_empty() || query.trim().len() < 2 {
        return Ok(TauriResult::error("Search query must be at least 2 characters".to_string()));
    }
    
    let max_results = max_results.unwrap_or(1000); // Default limit
    let project_path = Path::new(&project_path);
    
    if !project_path.exists() || !project_path.is_dir() {
        return Ok(TauriResult::error("Invalid project path".to_string()));
    }
    
    // Build search regex
    let search_regex = build_search_regex(&query, &options)?;
    
    // Convert file type filters to sets for faster lookup
    let include_types: HashSet<_> = options.include_file_types.iter().map(|s| s.as_str()).collect();
    let exclude_types: HashSet<_> = options.exclude_file_types.iter().map(|s| s.as_str()).collect();
    let exclude_dirs: HashSet<_> = options.exclude_directories.iter().map(|s| s.as_str()).collect();
    
    let start_time = std::time::Instant::now();
    let mut results = Vec::new();
    let mut total_matches = 0;
    let mut files_searched = 0;
    let mut total_files_found = 0;
    
    // Use ignore walker for better gitignore support
    let walker = WalkBuilder::new(project_path)
        .hidden(false)
        .parents(true)
        .ignore(true)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .require_git(false)
        .follow_links(false)
        .max_depth(Some(20))
        .build();
    
    for entry in walker {
        if total_matches >= max_results {
            tracing::info!("Reached max results limit: {}", max_results);
            break;
        }
        
        match entry {
            Ok(entry) => {
                let path = entry.path();
                if path.is_file() {
                    total_files_found += 1;
                    
                    // Apply file type filters
                    if !is_file_type_allowed(path, &include_types, &exclude_types, &exclude_dirs) {
                        continue;
                    }
                    
                    files_searched += 1;
                    
                    // Search in file
                    match search_in_file(path, &search_regex) {
                        Ok(file_matches) => {
                            if !file_matches.is_empty() {
                                let matches_count = file_matches.len() as u32;
                                total_matches += matches_count;
                                results.push(SearchResult {
                                    file: path.to_string_lossy().to_string(),
                                    matches: file_matches,
                                    total_matches: matches_count,
                                });
                            }
                        }
                        Err(e) => {
                            tracing::warn!("Error searching file {:?}: {}", path, e);
                        }
                    }
                }
            }
            Err(e) => {
                tracing::warn!("Error walking directory: {}", e);
            }
        }
        
        // Early termination check for performance
        if total_matches >= max_results {
            break;
        }
    }
    
    let search_duration = start_time.elapsed();
    tracing::info!(
        "Search completed in {:.2}ms: {} matches in {} files (searched {} of {} total files)",
        search_duration.as_millis(),
        total_matches,
        results.len(),
        files_searched,
        total_files_found
    );
    
    Ok(TauriResult::success(SearchData {
        results,
        total_matches,
        files_searched,
        total_files: total_files_found,
    }))
}

// Helper functions

fn build_search_regex(query: &str, options: &SearchOptions) -> std::result::Result<Regex, String> {
    if options.use_regex {
        Regex::new(query).map_err(|e| format!("Invalid regex: {}", e))
    } else {
        let escaped_query = regex::escape(query);
        let pattern = if options.whole_word {
            format!(r"\b{}\b", escaped_query)
        } else {
            escaped_query
        };
        
        let flags = if options.case_sensitive { "" } else { "(?i)" };
        Regex::new(&format!("{}{}", flags, pattern))
            .map_err(|e| format!("Failed to create search regex: {}", e))
    }
}

fn search_in_content(content: &str, regex: &Regex, path: &Path) -> Vec<SearchMatch> {
    let mut file_matches = Vec::new();
    const MAX_MATCHES_PER_FILE: usize = 20;
    
    // Search line by line for better match reporting
    for (line_num, line) in content.lines().enumerate() {
        if file_matches.len() >= MAX_MATCHES_PER_FILE {
            break;
        }
        
        for mat in regex.find_iter(line) {
            if file_matches.len() >= MAX_MATCHES_PER_FILE {
                break;
            }
            
            let match_obj = SearchMatch {
                file: path.to_string_lossy().to_string(),
                line: (line_num + 1) as u32,
                column: (mat.start() + 1) as u32,
                text: line.to_string(),
                match_start: mat.start() as u32,
                match_end: mat.end() as u32,
            };
            file_matches.push(match_obj);
        }
    }
    
    file_matches
}

fn search_in_file(path: &Path, regex: &Regex) -> Result<Vec<SearchMatch>, Box<dyn std::error::Error>> {
    // Skip very large files for performance
    if let Ok(metadata) = path.metadata() {
        const MAX_FILE_SIZE: u64 = 1024 * 1024; // 1MB limit
        if metadata.len() > MAX_FILE_SIZE {
            return Ok(Vec::new());
        }
    }
    
    let content = std::fs::read_to_string(path)?;
    Ok(search_in_content(&content, regex, path))
}

fn is_file_type_allowed(
    path: &Path,
    include_types: &HashSet<&str>,
    exclude_types: &HashSet<&str>,
    exclude_dirs: &HashSet<&str>,
) -> bool {
    // Check excluded directories
    if let Some(parent) = path.parent() {
        if exclude_dirs.iter().any(|&dir| parent.to_string_lossy().contains(dir)) {
            return false;
        }
    }
    
    // Check file extension filters
    if let Some(extension) = path.extension().and_then(|ext| ext.to_str()) {
        let ext_with_dot = format!(".{}", extension);
        
        // If include filters are specified, file must match one of them
        if !include_types.is_empty() && !include_types.contains(ext_with_dot.as_str()) {
            return false;
        }
        
        // Skip if file matches exclude filter
        if exclude_types.contains(ext_with_dot.as_str()) {
            return false;
        }
    }
    
    true
} 