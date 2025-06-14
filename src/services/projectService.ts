// Syntari AI IDE - Project Service
// Handles project-level operations and filesystem integration

import { invoke } from '@tauri-apps/api/core';
import type { 
  ProjectInfo, 
  FileSystemEntry,
  ServiceError 
} from './types';

class ProjectService {
  private currentProject: ProjectInfo | null = null;
  private projectFiles: Map<string, FileSystemEntry> = new Map();
  private watchers: Map<string, any> = new Map();

  /**
   * Open a project folder
   */
  async openProject(projectPath: string): Promise<ProjectInfo> {
    try {
      // Check if path exists and has proper permissions
      await invoke('check_folder_permissions', { folderPath: projectPath });
      
      // Load project information
      const projectInfo = await this.loadProjectInfo(projectPath);
      
      // Start file watcher for the project
      await this.startFileWatcher(projectPath);
      
      // Cache project files
      await this.cacheProjectFiles(projectPath);
      
      this.currentProject = projectInfo;
      
      return projectInfo;
    } catch (error) {
      throw this.handleError('OPEN_PROJECT_FAILED', `Failed to open project at ${projectPath}`, error);
    }
  }

  /**
   * Close the current project
   */
  async closeProject(): Promise<void> {
    try {
      if (this.currentProject) {
        // Stop file watcher
        await this.stopFileWatcher(this.currentProject.path);
        
        // Clear caches
        this.projectFiles.clear();
        this.currentProject = null;
      }
    } catch (error) {
      console.error('Error closing project:', error);
    }
  }

  /**
   * Get current project information
   */
  getCurrentProject(): ProjectInfo | null {
    return this.currentProject;
  }

  /**
   * Get project files with caching
   */
  async getProjectFiles(path?: string): Promise<FileSystemEntry[]> {
    try {
      const targetPath = path || this.currentProject?.path;
      if (!targetPath) {
        throw this.handleError('NO_PROJECT_OPEN', 'No project is currently open');
      }

      // Try cache first
      const cacheKey = targetPath;
      if (this.projectFiles.has(cacheKey)) {
        return [this.projectFiles.get(cacheKey)!];
      }

      // Load from filesystem
      const files = await invoke<any[]>('load_folder_contents', { 
        folderPath: targetPath 
      });

      const entries: FileSystemEntry[] = files.map(file => ({
        name: file.name,
        path: file.path,
        type: file.is_directory ? 'directory' : 'file',
        size: file.size,
        modified: new Date(file.modified),
        permissions: file.permissions || 'rw-r--r--',
      }));

      // Cache the results
      entries.forEach(entry => {
        this.projectFiles.set(entry.path, entry);
      });

      return entries;
    } catch (error) {
      throw this.handleError('GET_PROJECT_FILES_FAILED', 'Failed to get project files', error);
    }
  }

  /**
   * Search for files in the project
   */
  async searchProjectFiles(query: string): Promise<FileSystemEntry[]> {
    try {
      if (!this.currentProject) {
        throw this.handleError('NO_PROJECT_OPEN', 'No project is currently open');
      }

      const allFiles = Array.from(this.projectFiles.values());
      const queryLower = query.toLowerCase();

      return allFiles.filter(file => 
        file.name.toLowerCase().includes(queryLower) ||
        file.path.toLowerCase().includes(queryLower)
      );
    } catch (error) {
      throw this.handleError('SEARCH_FILES_FAILED', 'Failed to search project files', error);
    }
  }

  /**
   * Create a new file in the project
   */
  async createFile(filePath: string, content: string = ''): Promise<FileSystemEntry> {
    try {
      await invoke('create_file', { path: filePath, content });
      
      const fileEntry: FileSystemEntry = {
        name: filePath.split('/').pop() || filePath,
        path: filePath,
        type: 'file',
        size: content.length,
        modified: new Date(),
        permissions: 'rw-r--r--',
      };

      // Add to cache
      this.projectFiles.set(filePath, fileEntry);

      return fileEntry;
    } catch (error) {
      throw this.handleError('CREATE_FILE_FAILED', `Failed to create file ${filePath}`, error);
    }
  }

  /**
   * Create a new directory in the project
   */
  async createDirectory(dirPath: string): Promise<FileSystemEntry> {
    try {
      await invoke('create_directory', { path: dirPath });
      
      const dirEntry: FileSystemEntry = {
        name: dirPath.split('/').pop() || dirPath,
        path: dirPath,
        type: 'directory',
        modified: new Date(),
        permissions: 'rwxr-xr-x',
      };

      // Add to cache
      this.projectFiles.set(dirPath, dirEntry);

      return dirEntry;
    } catch (error) {
      throw this.handleError('CREATE_DIRECTORY_FAILED', `Failed to create directory ${dirPath}`, error);
    }
  }

  /**
   * Delete a file or directory
   */
  async deleteFileOrDirectory(path: string): Promise<void> {
    try {
      await invoke('delete_file', { path });
      
      // Remove from cache
      this.projectFiles.delete(path);
      
      // Remove any child entries if it was a directory
      const pathPrefix = path + '/';
      for (const [cachedPath] of this.projectFiles) {
        if (cachedPath.startsWith(pathPrefix)) {
          this.projectFiles.delete(cachedPath);
        }
      }
    } catch (error) {
      throw this.handleError('DELETE_FAILED', `Failed to delete ${path}`, error);
    }
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<string> {
    try {
      // Use backend's smart file reader that returns TauriResult<FileReadResult>
      const result = await invoke<any>('read_file_smart', { path: filePath });
      
      // Handle TauriResult pattern from backend
      if (result.success && result.data) {
        return result.data.content || '';
      } else {
        throw new Error(result.error || 'Failed to read file');
      }
    } catch (error) {
      throw this.handleError('READ_FILE_FAILED', `Failed to read file ${filePath}`, error);
    }
  }

  /**
   * Write file content
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await invoke('save_file', { path: filePath, content });
      
      // Update cache
      const existingEntry = this.projectFiles.get(filePath);
      if (existingEntry) {
        existingEntry.size = content.length;
        existingEntry.modified = new Date();
        this.projectFiles.set(filePath, existingEntry);
      }
    } catch (error) {
      throw this.handleError('WRITE_FILE_FAILED', `Failed to write file ${filePath}`, error);
    }
  }

  /**
   * Get project statistics
   */
  async getProjectStats(): Promise<{
    totalFiles: number;
    totalDirectories: number;
    totalSize: number;
    lastModified: Date;
  }> {
    try {
      if (!this.currentProject) {
        throw this.handleError('NO_PROJECT_OPEN', 'No project is currently open');
      }

      const files = Array.from(this.projectFiles.values());
      const fileEntries = files.filter(f => f.type === 'file');
      const dirEntries = files.filter(f => f.type === 'directory');
      
      const totalSize = fileEntries.reduce((sum, file) => sum + (file.size || 0), 0);
      const lastModified = files.reduce((latest, file) => 
        file.modified > latest ? file.modified : latest, 
        new Date(0)
      );

      return {
        totalFiles: fileEntries.length,
        totalDirectories: dirEntries.length,
        totalSize,
        lastModified,
      };
    } catch (error) {
      throw this.handleError('GET_STATS_FAILED', 'Failed to get project statistics', error);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const result = await invoke<any>('read_file_smart', { path: filePath });
      // Handle TauriResult pattern - if successful, file exists
      return result.success === true;
    } catch {
      return false;
    }
  }

  /**
   * Get file type based on extension
   */
  getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const typeMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'rs': 'rust',
      'go': 'go',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'dart': 'dart',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'md': 'markdown',
      'txt': 'text',
      'log': 'text',
    };

    return typeMap[extension || ''] || 'text';
  }

  /**
   * Invalidate cache for a path
   */
  invalidateCache(path: string): void {
    this.projectFiles.delete(path);
    
    // Remove any child entries
    const pathPrefix = path + '/';
    for (const [cachedPath] of this.projectFiles) {
      if (cachedPath.startsWith(pathPrefix)) {
        this.projectFiles.delete(cachedPath);
      }
    }
  }

  // Private helper methods
  private async loadProjectInfo(projectPath: string): Promise<ProjectInfo> {
    try {
      // Get directory stats
      const stats = await invoke<any>('get_directory_mtime', { path: projectPath });
      
      return {
        name: projectPath.split('/').pop() || projectPath,
        path: projectPath,
        type: await this.detectProjectType(projectPath),
        lastModified: new Date(stats.modified || Date.now()),
        files: 0, // Will be updated when files are loaded
        size: 0,  // Will be updated when files are loaded
      };
    } catch (error) {
      throw this.handleError('LOAD_PROJECT_INFO_FAILED', 'Failed to load project info', error);
    }
  }

  private async detectProjectType(projectPath: string): Promise<string> {
    try {
      // Check for common project files
      const configFiles = [
        'package.json',
        'Cargo.toml',
        'go.mod',
        'pom.xml',
        'requirements.txt',
        'composer.json',
        'pubspec.yaml',
        'Project.swift',
      ];

      for (const configFile of configFiles) {
        const exists = await this.fileExists(`${projectPath}/${configFile}`);
        if (exists) {
          switch (configFile) {
            case 'package.json': return 'Node.js';
            case 'Cargo.toml': return 'Rust';
            case 'go.mod': return 'Go';
            case 'pom.xml': return 'Java';
            case 'requirements.txt': return 'Python';
            case 'composer.json': return 'PHP';
            case 'pubspec.yaml': return 'Dart';
            case 'Project.swift': return 'Swift';
          }
        }
      }

      return 'Generic';
    } catch (error) {
      console.error('Failed to detect project type:', error);
      return 'Unknown';
    }
  }

  private async startFileWatcher(projectPath: string): Promise<void> {
    try {
      await invoke('start_file_watcher', { path: projectPath });
      
      // Store watcher reference
      this.watchers.set(projectPath, true);
    } catch (error) {
      console.error('Failed to start file watcher:', error);
    }
  }

  private async stopFileWatcher(projectPath: string): Promise<void> {
    try {
      await invoke('stop_file_watcher', { path: projectPath });
      
      // Remove watcher reference
      this.watchers.delete(projectPath);
    } catch (error) {
      console.error('Failed to stop file watcher:', error);
    }
  }

  private async cacheProjectFiles(projectPath: string): Promise<void> {
    try {
      // Load root files initially
      await this.getProjectFiles(projectPath);
      
      // Update project stats
      if (this.currentProject) {
        const stats = await this.getProjectStats();
        this.currentProject.files = stats.totalFiles;
        this.currentProject.size = stats.totalSize;
      }
    } catch (error) {
      console.error('Failed to cache project files:', error);
    }
  }

  private handleError(code: string, message: string, originalError?: any): ServiceError {
    console.error(`[ProjectService] ${code}: ${message}`, originalError);
    return {
      code,
      message,
      details: originalError,
    };
  }
}

// Export singleton instance
export const projectService = new ProjectService(); 