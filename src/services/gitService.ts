// Syntari AI IDE - Git Integration Service
// Real-time git status tracking and operations for enhanced file tree

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'ignored' | 'staged' | 'conflicted';
  indexStatus?: string; // Raw git index status
  workingStatus?: string; // Raw git working tree status
}

export interface GitBranchInfo {
  name: string;
  upstream?: string;
  ahead: number;
  behind: number;
  isDefault: boolean;
}

export interface GitRepository {
  rootPath: string;
  isInitialized: boolean;
  currentBranch: GitBranchInfo | null;
  fileStatuses: Map<string, GitFileStatus>;
  lastUpdate: number;
  remoteUrl?: string;
  isClean: boolean;
  stagedFiles: number;
  unstagedFiles: number;
  untrackedFiles: number;
}

export interface GitCommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  date: Date;
  message: string;
  files: string[];
}

export interface GitDiffResult {
  additions: number;
  deletions: number;
  files: Array<{
    path: string;
    additions: number;
    deletions: number;
    status: string;
  }>;
}

export class GitService {
  private repositories = new Map<string, GitRepository>();
  private updateCallbacks = new Set<(repo: GitRepository) => void>();
  private isWatching = false;

  constructor() {
    this.initializeWatcher();
  }

  // Initialize git file watcher
  private async initializeWatcher() {
    if (this.isWatching) return;

    try {
      // Listen for git file changes from Tauri
      await listen('git-status-changed', (event: any) => {
        const { repositoryPath, statuses } = event.payload;
        this.handleStatusUpdate(repositoryPath, statuses);
      });

      this.isWatching = true;
      console.log('🔄 Git file watcher initialized');
    } catch (error) {
      console.warn('⚠️ Git watcher initialization failed:', error);
    }
  }

  // Initialize repository
  async initializeRepository(rootPath: string): Promise<GitRepository> {
    try {
      const result = await invoke<{
        success: boolean;
        data?: {
          isGitRepo: boolean;
          currentBranch?: string;
          remoteUrl?: string;
          upstreamBranch?: string;
          ahead: number;
          behind: number;
        };
        error?: string;
      }>('git_initialize_repo', { path: rootPath });

      if (!result.success) {
        throw new Error(result.error || 'Failed to initialize git repository');
      }

      const data = result.data!;
      const repository: GitRepository = {
        rootPath,
        isInitialized: data.isGitRepo,
        currentBranch: data.currentBranch ? {
          name: data.currentBranch,
          upstream: data.upstreamBranch,
          ahead: data.ahead,
          behind: data.behind,
          isDefault: data.currentBranch === 'main' || data.currentBranch === 'master'
        } : null,
        fileStatuses: new Map(),
        lastUpdate: Date.now(),
        remoteUrl: data.remoteUrl,
        isClean: true,
        stagedFiles: 0,
        unstagedFiles: 0,
        untrackedFiles: 0
      };

      this.repositories.set(rootPath, repository);

      // Load initial status if it's a git repository
      if (data.isGitRepo) {
        await this.refreshStatus(rootPath);
      }

      return repository;
    } catch (error) {
      console.error('❌ Git repository initialization failed:', error);
      
      // Create a non-git repository entry
      const repository: GitRepository = {
        rootPath,
        isInitialized: false,
        currentBranch: null,
        fileStatuses: new Map(),
        lastUpdate: Date.now(),
        isClean: true,
        stagedFiles: 0,
        unstagedFiles: 0,
        untrackedFiles: 0
      };

      this.repositories.set(rootPath, repository);
      return repository;
    }
  }

  // Get repository status
  getRepository(rootPath: string): GitRepository | null {
    return this.repositories.get(rootPath) || null;
  }

  // Refresh git status for repository
  async refreshStatus(rootPath: string): Promise<void> {
    const repository = this.repositories.get(rootPath);
    if (!repository || !repository.isInitialized) return;

    try {
      const result = await invoke<{
        success: boolean;
        data?: Array<{
          path: string;
          indexStatus: string;
          workingTreeStatus: string;
        }>;
        error?: string;
      }>('git_get_status', { path: rootPath });

      if (!result.success) {
        console.warn('⚠️ Git status refresh failed:', result.error);
        return;
      }

      const statusMap = new Map<string, GitFileStatus>();
      let stagedFiles = 0;
      let unstagedFiles = 0;
      let untrackedFiles = 0;

      result.data?.forEach(item => {
        const status = this.parseGitStatus(item.indexStatus, item.workingTreeStatus);
        statusMap.set(item.path, {
          path: item.path,
          status,
          indexStatus: item.indexStatus,
          workingStatus: item.workingTreeStatus
        });

        // Count file types
        if (item.indexStatus !== ' ' && item.indexStatus !== '?') stagedFiles++;
        if (item.workingTreeStatus !== ' ' && item.workingTreeStatus !== '?') unstagedFiles++;
        if (item.workingTreeStatus === '?') untrackedFiles++;
      });

      // Update repository
      repository.fileStatuses = statusMap;
      repository.lastUpdate = Date.now();
      repository.isClean = statusMap.size === 0;
      repository.stagedFiles = stagedFiles;
      repository.unstagedFiles = unstagedFiles;
      repository.untrackedFiles = untrackedFiles;

      // Notify callbacks
      this.notifyCallbacks(repository);

    } catch (error) {
      console.error('❌ Git status refresh error:', error);
    }
  }

  // Parse git status codes to our enum
  private parseGitStatus(indexStatus: string, workingStatus: string): GitFileStatus['status'] {
    // Handle staged files first
    if (indexStatus !== ' ') {
      switch (indexStatus) {
        case 'A': return 'added';
        case 'M': return 'staged';
        case 'D': return 'deleted';
        case 'R': return 'modified';
        case 'C': return 'modified';
        default: return 'modified';
      }
    }

    // Handle working tree status
    switch (workingStatus) {
      case 'M': return 'modified';
      case 'A': return 'added';
      case 'D': return 'deleted';
      case '?': return 'untracked';
      case '!': return 'ignored';
      default: return 'modified';
    }
  }

  // Get file status
  getFileStatus(rootPath: string, filePath: string): GitFileStatus | null {
    const repository = this.repositories.get(rootPath);
    if (!repository || !repository.isInitialized) return null;

    // Try absolute path first, then relative
    const absolutePath = filePath.startsWith(rootPath) ? filePath : `${rootPath}/${filePath}`;
    const relativePath = filePath.replace(rootPath, '').replace(/^\//, '');

    return repository.fileStatuses.get(filePath) || 
           repository.fileStatuses.get(absolutePath) || 
           repository.fileStatuses.get(relativePath) || 
           null;
  }

  // Stage file
  async stageFile(rootPath: string, filePath: string): Promise<boolean> {
    try {
      const result = await invoke<{ success: boolean; error?: string }>('git_stage_file', {
        repositoryPath: rootPath,
        filePath: filePath
      });

      if (result.success) {
        await this.refreshStatus(rootPath);
        return true;
      } else {
        console.error('❌ Git stage failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Git stage error:', error);
      return false;
    }
  }

  // Unstage file
  async unstageFile(rootPath: string, filePath: string): Promise<boolean> {
    try {
      const result = await invoke<{ success: boolean; error?: string }>('git_unstage_file', {
        repositoryPath: rootPath,
        filePath: filePath
      });

      if (result.success) {
        await this.refreshStatus(rootPath);
        return true;
      } else {
        console.error('❌ Git unstage failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Git unstage error:', error);
      return false;
    }
  }

  // Discard changes
  async discardChanges(rootPath: string, filePath: string): Promise<boolean> {
    try {
      const result = await invoke<{ success: boolean; error?: string }>('git_discard_changes', {
        repositoryPath: rootPath,
        filePath: filePath
      });

      if (result.success) {
        await this.refreshStatus(rootPath);
        return true;
      } else {
        console.error('❌ Git discard failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Git discard error:', error);
      return false;
    }
  }

  // Get branches
  async getBranches(rootPath: string): Promise<GitBranchInfo[]> {
    try {
      const result = await invoke<{
        success: boolean;
        data?: Array<{
          name: string;
          upstream?: string;
          ahead: number;
          behind: number;
          isDefault: boolean;
          isCurrent: boolean;
        }>;
        error?: string;
      }>('git_get_branches', { path: rootPath });

      if (!result.success || !result.data) {
        return [];
      }

      return result.data.map(branch => ({
        name: branch.name,
        upstream: branch.upstream,
        ahead: branch.ahead,
        behind: branch.behind,
        isDefault: branch.isDefault
      }));
    } catch (error) {
      console.error('❌ Git branches fetch error:', error);
      return [];
    }
  }

  // Switch branch
  async switchBranch(rootPath: string, branchName: string): Promise<boolean> {
    try {
      const result = await invoke<{ success: boolean; error?: string }>('git_switch_branch', {
        repositoryPath: rootPath,
        branchName: branchName
      });

      if (result.success) {
        await this.refreshStatus(rootPath);
        // Update current branch info
        const repository = this.repositories.get(rootPath);
        if (repository && repository.currentBranch) {
          repository.currentBranch.name = branchName;
        }
        return true;
      } else {
        console.error('❌ Git branch switch failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Git branch switch error:', error);
      return false;
    }
  }

  // Create branch
  async createBranch(rootPath: string, branchName: string, fromBranch?: string): Promise<boolean> {
    try {
      const result = await invoke<{ success: boolean; error?: string }>('git_create_branch', {
        repositoryPath: rootPath,
        branchName: branchName,
        fromBranch: fromBranch
      });

      if (result.success) {
        await this.refreshStatus(rootPath);
        return true;
      } else {
        console.error('❌ Git branch creation failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Git branch creation error:', error);
      return false;
    }
  }

  // Commit changes
  async commit(rootPath: string, message: string, files?: string[]): Promise<boolean> {
    try {
      const result = await invoke<{ success: boolean; error?: string }>('git_commit', {
        repositoryPath: rootPath,
        message: message,
        files: files
      });

      if (result.success) {
        await this.refreshStatus(rootPath);
        return true;
      } else {
        console.error('❌ Git commit failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Git commit error:', error);
      return false;
    }
  }

  // Get commit history
  async getCommitHistory(rootPath: string, limit: number = 20): Promise<GitCommitInfo[]> {
    try {
      const result = await invoke<{
        success: boolean;
        data?: Array<{
          hash: string;
          shortHash: string;
          author: string;
          timestamp: number;
          message: string;
          files: string[];
        }>;
        error?: string;
      }>('git_get_commits', { 
        path: rootPath,
        limit: limit
      });

      if (!result.success || !result.data) {
        return [];
      }

      return result.data.map(commit => ({
        hash: commit.hash,
        shortHash: commit.shortHash,
        author: commit.author,
        date: new Date(commit.timestamp * 1000),
        message: commit.message,
        files: commit.files
      }));
    } catch (error) {
      console.error('❌ Git commit history error:', error);
      return [];
    }
  }

  // Get diff for file
  async getFileDiff(rootPath: string, filePath: string, staged: boolean = false): Promise<string> {
    try {
      const result = await invoke<{ success: boolean; data?: string; error?: string }>('git_get_diff', {
        repositoryPath: rootPath,
        filePath: filePath,
        staged: staged
      });

      if (result.success && result.data) {
        return result.data;
      } else {
        console.warn('⚠️ Git diff failed:', result.error);
        return '';
      }
    } catch (error) {
      console.error('❌ Git diff error:', error);
      return '';
    }
  }

  // Handle status update from watcher
  private handleStatusUpdate(repositoryPath: string, statuses: any[]) {
    const repository = this.repositories.get(repositoryPath);
    if (!repository) return;

    const statusMap = new Map<string, GitFileStatus>();
    statuses.forEach(status => {
      statusMap.set(status.path, {
        path: status.path,
        status: this.parseGitStatus(status.indexStatus, status.workingStatus),
        indexStatus: status.indexStatus,
        workingStatus: status.workingStatus
      });
    });

    repository.fileStatuses = statusMap;
    repository.lastUpdate = Date.now();
    repository.isClean = statusMap.size === 0;

    this.notifyCallbacks(repository);
  }

  // Subscribe to repository updates
  onRepositoryUpdate(callback: (repo: GitRepository) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  // Notify all callbacks
  private notifyCallbacks(repository: GitRepository) {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(repository);
      } catch (error) {
        console.error('❌ Git callback error:', error);
      }
    });
  }

  // Clean up
  dispose() {
    this.repositories.clear();
    this.updateCallbacks.clear();
    this.isWatching = false;
  }

  // Get all repositories
  getAllRepositories(): GitRepository[] {
    return Array.from(this.repositories.values());
  }

  // Check if path is in git repository
  isGitRepository(rootPath: string): boolean {
    const repository = this.repositories.get(rootPath);
    return repository?.isInitialized || false;
  }
}

// Export singleton instance
export const gitService = new GitService(); 