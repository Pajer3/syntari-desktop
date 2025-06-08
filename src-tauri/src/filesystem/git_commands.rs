// Syntari AI IDE - Git Commands for Tauri Backend
// Real git operations using git2 library for high performance

use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::command;
use crate::core::{AppResult, AppError};

// Git status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitFileStatus {
    pub path: String,
    #[serde(rename = "indexStatus")]
    pub index_status: String,
    #[serde(rename = "workingTreeStatus")]
    pub working_tree_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitRepositoryInfo {
    #[serde(rename = "isGitRepo")]
    pub is_git_repo: bool,
    #[serde(rename = "currentBranch")]
    pub current_branch: Option<String>,
    #[serde(rename = "remoteUrl")]
    pub remote_url: Option<String>,
    #[serde(rename = "upstreamBranch")]
    pub upstream_branch: Option<String>,
    pub ahead: i32,
    pub behind: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitBranch {
    pub name: String,
    pub upstream: Option<String>,
    pub ahead: i32,
    pub behind: i32,
    #[serde(rename = "isDefault")]
    pub is_default: bool,
    #[serde(rename = "isCurrent")]
    pub is_current: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCommit {
    pub hash: String,
    #[serde(rename = "shortHash")]
    pub short_hash: String,
    pub author: String,
    pub timestamp: i64,
    pub message: String,
    pub files: Vec<String>,
}

/// Initialize and get git repository information
#[command]
pub async fn git_initialize_repo(path: String) -> AppResult<GitRepositoryInfo> {
    use git2::Repository;
    
    let repo_path = Path::new(&path);
    
    // Check if this is a git repository
    match Repository::discover(repo_path) {
        Ok(repo) => {
            let head = repo.head().ok();
            let current_branch = head
                .and_then(|h| h.shorthand().map(|s| s.to_string()));
            
            // Get remote information
            let remote_url = repo.find_remote("origin")
                .ok()
                .and_then(|remote| remote.url().map(|url| url.to_string()));
            
            // Get upstream branch info
            let upstream_branch = if let Some(ref branch) = current_branch {
                repo.find_branch(branch, git2::BranchType::Local)
                    .ok()
                    .and_then(|b| b.upstream().ok())
                    .and_then(|upstream| upstream.name().ok().flatten().map(|s| s.to_string()))
            } else {
                None
            };
            
            // Calculate ahead/behind (simplified - in reality would need more complex logic)
            let (ahead, behind) = (0, 0); // TODO: Implement proper ahead/behind calculation
            
            Ok(GitRepositoryInfo {
                is_git_repo: true,
                current_branch,
                remote_url,
                upstream_branch,
                ahead,
                behind,
            })
        }
        Err(_) => {
            // Not a git repository
            Ok(GitRepositoryInfo {
                is_git_repo: false,
                current_branch: None,
                remote_url: None,
                upstream_branch: None,
                ahead: 0,
                behind: 0,
            })
        }
    }
}

/// Get git status for repository
#[command]
pub async fn git_get_status(path: String) -> AppResult<Vec<GitFileStatus>> {
    use git2::{Repository, Status};
    
    let repo = Repository::discover(&path)
        .map_err(|e| AppError::git_error("REPO_NOT_FOUND", &format!("Repository not found: {}", e)))?;
    
    let mut statuses = Vec::new();
    let status_options = git2::StatusOptions::new();
    let git_statuses = repo.statuses(Some(&mut status_options.into()))
        .map_err(|e| AppError::git_error("STATUS_ERROR", &format!("Failed to get status: {}", e)))?;
    
    for entry in git_statuses.iter() {
        let file_path = entry.path().unwrap_or("").to_string();
        let status = entry.status();
        
        let index_status = if status.contains(Status::INDEX_NEW) { "A" }
        else if status.contains(Status::INDEX_MODIFIED) { "M" }
        else if status.contains(Status::INDEX_DELETED) { "D" }
        else if status.contains(Status::INDEX_RENAMED) { "R" }
        else if status.contains(Status::INDEX_TYPECHANGE) { "T" }
        else { " " };
        
        let working_status = if status.contains(Status::WT_NEW) { "?" }
        else if status.contains(Status::WT_MODIFIED) { "M" }
        else if status.contains(Status::WT_DELETED) { "D" }
        else if status.contains(Status::WT_RENAMED) { "R" }
        else if status.contains(Status::WT_TYPECHANGE) { "T" }
        else if status.contains(Status::IGNORED) { "!" }
        else { " " };
        
        statuses.push(GitFileStatus {
            path: file_path,
            index_status: index_status.to_string(),
            working_tree_status: working_status.to_string(),
        });
    }
    
    Ok(statuses)
}

/// Get list of branches
#[command]
pub async fn git_get_branches(path: String) -> AppResult<Vec<GitBranch>> {
    use git2::{Repository, BranchType};
    
    let repo = Repository::discover(&path)
        .map_err(|e| AppError::git_error("REPO_NOT_FOUND", &format!("Repository not found: {}", e)))?;
    
    let mut branches = Vec::new();
    let current_branch_name = repo.head()
        .ok()
        .and_then(|head| head.shorthand().map(|s| s.to_string()));
    
    let branch_iter = repo.branches(Some(BranchType::Local))
        .map_err(|e| AppError::git_error("BRANCH_ERROR", &format!("Failed to get branches: {}", e)))?;
    
    for branch_result in branch_iter {
        if let Ok((branch, _)) = branch_result {
            if let Some(name) = branch.name().ok().flatten() {
                let is_current = current_branch_name.as_ref() == Some(&name.to_string());
                let is_default = name == "main" || name == "master";
                
                // Get upstream info
                let upstream = branch.upstream().ok()
                    .and_then(|upstream| upstream.name().ok().flatten().map(|s| s.to_string()));
                
                branches.push(GitBranch {
                    name: name.to_string(),
                    upstream,
                    ahead: 0, // TODO: Calculate ahead/behind
                    behind: 0,
                    is_default,
                    is_current,
                });
            }
        }
    }
    
    Ok(branches)
}

/// Stage a file
#[command]
pub async fn git_stage_file(repository_path: String, file_path: String) -> AppResult<()> {
    use git2::Repository;
    
    let repo = Repository::discover(&repository_path)
        .map_err(|e| AppError::git_error("REPO_NOT_FOUND", &format!("Repository not found: {}", e)))?;
    
    let mut index = repo.index()
        .map_err(|e| AppError::git_error("INDEX_ERROR", &format!("Failed to get index: {}", e)))?;
    
    // Convert absolute path to relative path if needed
    let relative_path = if file_path.starts_with(&repository_path) {
        file_path.strip_prefix(&repository_path)
            .unwrap_or(&file_path)
            .trim_start_matches('/')
    } else {
        &file_path
    };
    
    index.add_path(Path::new(relative_path))
        .map_err(|e| AppError::git_error("STAGE_ERROR", &format!("Failed to stage file: {}", e)))?;
    
    index.write()
        .map_err(|e| AppError::git_error("INDEX_WRITE_ERROR", &format!("Failed to write index: {}", e)))?;
    
    Ok(())
}

/// Unstage a file
#[command]
pub async fn git_unstage_file(repository_path: String, file_path: String) -> AppResult<()> {
    use git2::Repository;
    
    let repo = Repository::discover(&repository_path)
        .map_err(|e| AppError::git_error("REPO_NOT_FOUND", &format!("Repository not found: {}", e)))?;
    
    let head = repo.head()
        .map_err(|e| AppError::git_error("HEAD_ERROR", &format!("Failed to get HEAD: {}", e)))?;
    
    let head_commit = head.peel_to_commit()
        .map_err(|e| AppError::git_error("COMMIT_ERROR", &format!("Failed to get commit: {}", e)))?;
    
    let head_tree = head_commit.tree()
        .map_err(|e| AppError::git_error("TREE_ERROR", &format!("Failed to get tree: {}", e)))?;
    
    // Convert absolute path to relative path if needed
    let relative_path = if file_path.starts_with(&repository_path) {
        file_path.strip_prefix(&repository_path)
            .unwrap_or(&file_path)
            .trim_start_matches('/')
    } else {
        &file_path
    };
    
    repo.reset_default(Some(&head_commit.into_object()), &[Path::new(relative_path)])
        .map_err(|e| AppError::git_error("UNSTAGE_ERROR", &format!("Failed to unstage file: {}", e)))?;
    
    Ok(())
}

/// Discard changes to a file
#[command]
pub async fn git_discard_changes(repository_path: String, file_path: String) -> AppResult<()> {
    use git2::{Repository, build::CheckoutBuilder};
    
    let repo = Repository::discover(&repository_path)
        .map_err(|e| AppError::git_error("REPO_NOT_FOUND", &format!("Repository not found: {}", e)))?;
    
    // Convert absolute path to relative path if needed
    let relative_path = if file_path.starts_with(&repository_path) {
        file_path.strip_prefix(&repository_path)
            .unwrap_or(&file_path)
            .trim_start_matches('/')
    } else {
        &file_path
    };
    
    let mut checkout = CheckoutBuilder::new();
    checkout.path(relative_path);
    checkout.force();
    
    repo.checkout_head(Some(&mut checkout))
        .map_err(|e| AppError::git_error("DISCARD_ERROR", &format!("Failed to discard changes: {}", e)))?;
    
    Ok(())
}

/// Switch to a different branch
#[command]
pub async fn git_switch_branch(repository_path: String, branch_name: String) -> AppResult<()> {
    use git2::{Repository, build::CheckoutBuilder, BranchType};
    
    let repo = Repository::discover(&repository_path)
        .map_err(|e| AppError::git_error("REPO_NOT_FOUND", &format!("Repository not found: {}", e)))?;
    
    // Find the branch
    let branch = repo.find_branch(&branch_name, BranchType::Local)
        .map_err(|e| AppError::git_error("BRANCH_NOT_FOUND", &format!("Branch not found: {}", e)))?;
    
    let branch_ref = branch.get();
    let target_commit = branch_ref.peel_to_commit()
        .map_err(|e| AppError::git_error("COMMIT_ERROR", &format!("Failed to get commit: {}", e)))?;
    
    // Checkout the branch
    let mut checkout = CheckoutBuilder::new();
    repo.checkout_tree(&target_commit.into_object(), Some(&mut checkout))
        .map_err(|e| AppError::git_error("CHECKOUT_ERROR", &format!("Failed to checkout: {}", e)))?;
    
    // Update HEAD
    repo.set_head(&format!("refs/heads/{}", branch_name))
        .map_err(|e| AppError::git_error("HEAD_UPDATE_ERROR", &format!("Failed to update HEAD: {}", e)))?;
    
    Ok(())
}

/// Create a new branch
#[command]
pub async fn git_create_branch(repository_path: String, branch_name: String, from_branch: Option<String>) -> AppResult<()> {
    use git2::{Repository, BranchType};
    
    let repo = Repository::discover(&repository_path)
        .map_err(|e| AppError::git_error("REPO_NOT_FOUND", &format!("Repository not found: {}", e)))?;
    
    // Get the commit to branch from
    let target_commit = if let Some(from) = from_branch {
        repo.find_branch(&from, BranchType::Local)
            .map_err(|e| AppError::git_error("FROM_BRANCH_NOT_FOUND", &format!("From branch not found: {}", e)))?
            .get()
            .peel_to_commit()
            .map_err(|e| AppError::git_error("COMMIT_ERROR", &format!("Failed to get commit: {}", e)))?
    } else {
        repo.head()
            .map_err(|e| AppError::git_error("HEAD_ERROR", &format!("Failed to get HEAD: {}", e)))?
            .peel_to_commit()
            .map_err(|e| AppError::git_error("COMMIT_ERROR", &format!("Failed to get commit: {}", e)))?
    };
    
    // Create the branch
    repo.branch(&branch_name, &target_commit, false)
        .map_err(|e| AppError::git_error("CREATE_BRANCH_ERROR", &format!("Failed to create branch: {}", e)))?;
    
    Ok(())
}

/// Commit staged changes
#[command]
pub async fn git_commit(repository_path: String, message: String, files: Option<Vec<String>>) -> AppResult<()> {
    use git2::{Repository, Signature};
    
    let repo = Repository::discover(&repository_path)
        .map_err(|e| AppError::git_error("REPO_NOT_FOUND", &format!("Repository not found: {}", e)))?;
    
    // If specific files are provided, stage them first
    if let Some(file_list) = files {
        let mut index = repo.index()
            .map_err(|e| AppError::git_error("INDEX_ERROR", &format!("Failed to get index: {}", e)))?;
        
        for file_path in file_list {
            let relative_path = if file_path.starts_with(&repository_path) {
                file_path.strip_prefix(&repository_path)
                    .unwrap_or(&file_path)
                    .trim_start_matches('/')
            } else {
                &file_path
            };
            
            index.add_path(Path::new(relative_path))
                .map_err(|e| AppError::git_error("STAGE_ERROR", &format!("Failed to stage file: {}", e)))?;
        }
        
        index.write()
            .map_err(|e| AppError::git_error("INDEX_WRITE_ERROR", &format!("Failed to write index: {}", e)))?;
    }
    
    // Get signature
    let signature = Signature::now("Syntari User", "user@syntari.ai")
        .map_err(|e| AppError::git_error("SIGNATURE_ERROR", &format!("Failed to create signature: {}", e)))?;
    
    // Get index tree
    let mut index = repo.index()
        .map_err(|e| AppError::git_error("INDEX_ERROR", &format!("Failed to get index: {}", e)))?;
    
    let tree_id = index.write_tree()
        .map_err(|e| AppError::git_error("TREE_ERROR", &format!("Failed to write tree: {}", e)))?;
    
    let tree = repo.find_tree(tree_id)
        .map_err(|e| AppError::git_error("TREE_FIND_ERROR", &format!("Failed to find tree: {}", e)))?;
    
    // Get parent commit
    let parent_commit = repo.head()
        .ok()
        .and_then(|head| head.peel_to_commit().ok());
    
    // Create commit
    let parents = if let Some(ref parent) = parent_commit {
        vec![parent]
    } else {
        vec![]
    };
    
    repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        &message,
        &tree,
        &parents,
    ).map_err(|e| AppError::git_error("COMMIT_ERROR", &format!("Failed to commit: {}", e)))?;
    
    Ok(())
}

/// Get commit history
#[command]
pub async fn git_get_commits(path: String, limit: Option<u32>) -> AppResult<Vec<GitCommit>> {
    use git2::{Repository, Sort};
    
    let repo = Repository::discover(&path)
        .map_err(|e| AppError::git_error("REPO_NOT_FOUND", &format!("Repository not found: {}", e)))?;
    
    let mut revwalk = repo.revwalk()
        .map_err(|e| AppError::git_error("REVWALK_ERROR", &format!("Failed to create revwalk: {}", e)))?;
    
    revwalk.set_sorting(Sort::TIME)
        .map_err(|e| AppError::git_error("SORT_ERROR", &format!("Failed to set sorting: {}", e)))?;
    
    revwalk.push_head()
        .map_err(|e| AppError::git_error("PUSH_HEAD_ERROR", &format!("Failed to push HEAD: {}", e)))?;
    
    let mut commits = Vec::new();
    let limit = limit.unwrap_or(20) as usize;
    
    for (i, oid_result) in revwalk.enumerate() {
        if i >= limit { break; }
        
        let oid = oid_result
            .map_err(|e| AppError::git_error("OID_ERROR", &format!("Failed to get OID: {}", e)))?;
        
        let commit = repo.find_commit(oid)
            .map_err(|e| AppError::git_error("COMMIT_FIND_ERROR", &format!("Failed to find commit: {}", e)))?;
        
        let message = commit.message().unwrap_or("").to_string();
        let author = commit.author();
        let timestamp = commit.time().seconds();
        let hash = format!("{}", oid);
        let short_hash = format!("{:.7}", oid);
        
        // Get files changed in this commit (simplified)
        let files = vec![]; // TODO: Implement file list
        
        commits.push(GitCommit {
            hash,
            short_hash,
            author: author.name().unwrap_or("Unknown").to_string(),
            timestamp,
            message,
            files,
        });
    }
    
    Ok(commits)
}

/// Get diff for a file
#[command]
pub async fn git_get_diff(repository_path: String, file_path: String, staged: bool) -> AppResult<String> {
    use git2::{Repository, DiffOptions};
    
    let repo = Repository::discover(&repository_path)
        .map_err(|e| AppError::git_error("REPO_NOT_FOUND", &format!("Repository not found: {}", e)))?;
    
    // Convert absolute path to relative path if needed
    let relative_path = if file_path.starts_with(&repository_path) {
        file_path.strip_prefix(&repository_path)
            .unwrap_or(&file_path)
            .trim_start_matches('/')
    } else {
        &file_path
    };
    
    let mut diff_options = DiffOptions::new();
    diff_options.pathspec(relative_path);
    
    let diff = if staged {
        // Diff between HEAD and index (staged changes)
        let head_tree = repo.head()
            .ok()
            .and_then(|head| head.peel_to_tree().ok());
        
        repo.diff_tree_to_index(head_tree.as_ref(), None, Some(&mut diff_options))
            .map_err(|e| AppError::git_error("DIFF_ERROR", &format!("Failed to get staged diff: {}", e)))?
    } else {
        // Diff between index and working directory (unstaged changes)
        repo.diff_index_to_workdir(None, Some(&mut diff_options))
            .map_err(|e| AppError::git_error("DIFF_ERROR", &format!("Failed to get unstaged diff: {}", e)))?
    };
    
    // Convert diff to string (simplified - would need proper diff formatting)
    let mut diff_text = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        match line.origin() {
            '+' | '-' | ' ' => {
                diff_text.push(line.origin());
                if let Ok(content) = std::str::from_utf8(line.content()) {
                    diff_text.push_str(content);
                }
            }
            _ => {}
        }
        true
    }).map_err(|e| AppError::git_error("DIFF_PRINT_ERROR", &format!("Failed to print diff: {}", e)))?;
    
    Ok(diff_text)
} 