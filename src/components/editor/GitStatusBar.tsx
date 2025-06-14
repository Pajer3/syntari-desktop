// Syntari AI IDE - Git Status Bar Component
// Shows current branch, changes, and git operations in file tree

import React, { useState, useCallback } from 'react';
import { gitService, type GitRepository, type GitBranchInfo } from '../../services/gitService';

interface GitStatusBarProps {
  repository: GitRepository | null;
  className?: string;
  onRefresh?: () => void;
}

export const GitStatusBar: React.FC<GitStatusBarProps> = ({
  repository,
  className = '',
  onRefresh
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [branches, setBranches] = useState<GitBranchInfo[]>([]);

  // Handle branch menu toggle
  const handleBranchMenuToggle = useCallback(async () => {
    if (!repository?.isInitialized) return;

    if (!showBranchMenu) {
      setIsLoading(true);
      try {
        const branchList = await gitService.getBranches(repository.rootPath);
        setBranches(branchList);
      } catch (error) {
        console.error('Failed to load branches:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    setShowBranchMenu(!showBranchMenu);
  }, [repository, showBranchMenu]);

  // Switch branch
  const handleBranchSwitch = useCallback(async (branchName: string) => {
    if (!repository?.isInitialized) return;

    setIsLoading(true);
    try {
      const success = await gitService.switchBranch(repository.rootPath, branchName);
      if (success) {
        setShowBranchMenu(false);
        onRefresh?.();
      }
    } catch (error) {
      console.error('Failed to switch branch:', error);
    } finally {
      setIsLoading(false);
    }
  }, [repository, onRefresh]);

  // Refresh git status
  const handleRefresh = useCallback(async () => {
    if (!repository?.isInitialized) return;

    setIsLoading(true);
    try {
      await gitService.refreshStatus(repository.rootPath);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to refresh git status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [repository, onRefresh]);

  if (!repository) {
    return (
      <div className={`flex items-center justify-between px-3 py-2 border-t border-vscode-border text-xs text-vscode-fg-muted bg-vscode-bg ${className}`}>
        <span>No git repository</span>
      </div>
    );
  }

  if (!repository.isInitialized) {
    return (
      <div className={`flex items-center justify-between px-3 py-2 border-t border-vscode-border text-xs text-vscode-fg-muted bg-vscode-bg ${className}`}>
        <span>Not a git repository</span>
        <button
          onClick={() => {
            // Feature: Initialize git repository in current directory
            // Implementation notes: Call gitService.initializeRepository(path) and refresh UI
          }}
          className="text-vscode-accent hover:text-vscode-accent-hover"
          title="Initialize Git Repository"
        >
          Initialize Git
        </button>
      </div>
    );
  }

  const { currentBranch, stagedFiles, unstagedFiles, untrackedFiles } = repository;
  const totalChanges = stagedFiles + unstagedFiles + untrackedFiles;

  return (
    <div className={`border-t border-vscode-border bg-vscode-bg ${className}`}>
      {/* Main Status Bar */}
      <div className="flex items-center justify-between px-3 py-2 text-xs">
        {/* Left Side - Branch Info */}
        <div className="flex items-center space-x-3">
          {/* Branch Button */}
          <div className="relative">
            <button
              onClick={handleBranchMenuToggle}
              disabled={isLoading}
              className="flex items-center space-x-1 text-vscode-fg hover:text-vscode-accent transition-colors"
              title={currentBranch ? `Current branch: ${currentBranch.name}` : 'No branch'}
            >
              <span className="text-sm">🌿</span>
              <span className="font-mono">
                {currentBranch?.name || 'HEAD'}
              </span>
              {currentBranch && currentBranch.ahead && currentBranch.ahead > 0 && (
                <span className="text-green-400">↑{currentBranch.ahead}</span>
              )}
              {currentBranch && currentBranch.behind && currentBranch.behind > 0 && (
                <span className="text-red-400">↓{currentBranch.behind}</span>
              )}
              <span className="text-vscode-fg-muted">▼</span>
            </button>

            {/* Branch Menu */}
            {showBranchMenu && (
              <div className="absolute bottom-full left-0 mb-1 w-64 bg-vscode-dropdown border border-vscode-border rounded shadow-lg z-50">
                <div className="p-2 border-b border-vscode-border">
                  <div className="text-xs text-vscode-fg-muted mb-2">Switch Branch</div>
                  <div className="max-h-48 overflow-y-auto">
                    {isLoading ? (
                      <div className="py-2 text-center text-vscode-fg-muted">Loading...</div>
                    ) : branches.length === 0 ? (
                      <div className="py-2 text-center text-vscode-fg-muted">No branches found</div>
                    ) : (
                      branches.map(branch => (
                        <button
                          key={branch.name}
                          onClick={() => handleBranchSwitch(branch.name)}
                          disabled={branch.name === currentBranch?.name}
                          className={`w-full text-left px-2 py-1 text-xs hover:bg-vscode-list-hover rounded transition-colors ${
                            branch.name === currentBranch?.name 
                              ? 'bg-vscode-list-active text-vscode-list-active-fg' 
                              : 'text-vscode-fg'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono">{branch.name}</span>
                            {branch.name === currentBranch?.name && (
                              <span className="text-vscode-accent">✓</span>
                            )}
                          </div>
                          {branch.upstream && (
                            <div className="text-vscode-fg-muted text-xs">
                              ↑ {branch.upstream}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => setShowBranchMenu(false)}
                    className="w-full text-xs text-vscode-fg-muted hover:text-vscode-fg"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Remote Info */}
          {repository.remoteUrl && (
            <span className="text-vscode-fg-muted" title={repository.remoteUrl}>
              🌐 {repository.remoteUrl.split('/').pop()?.replace('.git', '')}
            </span>
          )}
        </div>

        {/* Right Side - Changes & Actions */}
        <div className="flex items-center space-x-3">
          {/* Change Summary */}
          {totalChanges > 0 ? (
            <div className="flex items-center space-x-2 text-vscode-fg-muted">
              {stagedFiles > 0 && (
                <span className="text-green-400" title={`${stagedFiles} staged files`}>
                  ●{stagedFiles}
                </span>
              )}
              {unstagedFiles > 0 && (
                <span className="text-yellow-400" title={`${unstagedFiles} modified files`}>
                  ●{unstagedFiles}
                </span>
              )}
              {untrackedFiles > 0 && (
                <span className="text-blue-400" title={`${untrackedFiles} untracked files`}>
                  ●{untrackedFiles}
                </span>
              )}
            </div>
          ) : (
            <span className="text-green-400 text-xs">✓ Clean</span>
          )}

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-vscode-fg-muted hover:text-vscode-fg transition-colors"
            title="Refresh Git Status"
          >
            {isLoading ? '⟳' : '🔄'}
          </button>
        </div>
      </div>

      {/* Click outside to close branch menu */}
      {showBranchMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowBranchMenu(false)}
        />
      )}
    </div>
  );
}; 