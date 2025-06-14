// Syntari AI IDE - File Management Service
// Professional file operations with error handling and validation

import { invoke } from '@tauri-apps/api/core';
import type { TauriResult } from '../types/core';

export interface FileCreateOptions {
  fileName: string;
  content?: string;
  path?: string;
  overwrite?: boolean;
}

export interface FileSaveAsOptions {
  currentFilePath?: string;
  newFilePath: string;
  newFileName: string;
  content: string;
}

export interface FileOpenResult {
  path: string;
  content: string;
  name: string;
  size: number;
  lastModified: Date;
}

export class FileManagementService {
  private static instance: FileManagementService;

  public static getInstance(): FileManagementService {
    if (!FileManagementService.instance) {
      FileManagementService.instance = new FileManagementService();
    }
    return FileManagementService.instance;
  }

  /**
   * Invalidate file cache for a specific path
   */
  private invalidateFileCache(filePath: string): void {
    // Clear any cached file information for this path
    // This ensures next read will fetch fresh data from backend
    console.log(`Cache invalidated for: ${filePath}`);
  }

  /**
   * Check if file exists using backend
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const result = await invoke<any>('read_file_smart', { path: filePath });
      return result.success === true;
    } catch {
      return false;
    }
  }

  /**
   * Handle service errors with consistent error format
   */
  private handleError(code: string, message: string, originalError?: any): Error {
    console.error(`[FileManagementService] ${code}: ${message}`, originalError);
    return new Error(`${code}: ${message}`);
  }

  /**
   * Write file content to disk
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // Use backend write_file command with proper error handling
      const result = await invoke<any>('write_file', { path: filePath, content });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to write file');
      }
      
      // Update cache if file was successfully written
      this.invalidateFileCache(filePath);
      
    } catch (error) {
      throw this.handleError('WRITE_FILE_FAILED', `Failed to write file ${filePath}`, error);
    }
  }

  /**
   * Create a new file
   */
  async createFile(filePath: string, content: string = ''): Promise<void> {
    try {
      // Use backend create_file command
      const result = await invoke<any>('create_file', { path: filePath, content });
      
      if (typeof result === 'string') {
        // Backend returns string on success
        console.log('File created:', result);
      } else {
        throw new Error('Failed to create file');
      }
      
      this.invalidateFileCache(filePath);
      
    } catch (error) {
      throw this.handleError('CREATE_FILE_FAILED', `Failed to create file ${filePath}`, error);
    }
  }

  /**
   * Create a directory
   */
  async createDirectory(dirPath: string): Promise<void> {
    try {
      // Use backend create_directory command  
      const result = await invoke<any>('create_directory', { path: dirPath });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create directory');
      }
      
      this.invalidateFileCache(dirPath);
      
    } catch (error) {
      throw this.handleError('CREATE_DIRECTORY_FAILED', `Failed to create directory ${dirPath}`, error);
    }
  }

  /**
   * Delete a file or directory
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      // Use backend delete_file command
      const result = await invoke<any>('delete_file', { path: filePath });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete file');
      }
      
      this.invalidateFileCache(filePath);
      
    } catch (error) {
      throw this.handleError('DELETE_FILE_FAILED', `Failed to delete file ${filePath}`, error);
    }
  }

  /**
   * Saves a file with a new name/location (Save As functionality)
   */
  async saveFileAs(options: FileSaveAsOptions): Promise<FileOpenResult> {
    try {
      const { newFilePath, newFileName, content } = options;
      
      // Validate inputs
      if (!newFileName.trim()) {
        throw new Error('File name cannot be empty');
      }

      if (!content && content !== '') {
        throw new Error('Content cannot be undefined');
      }

      // Construct full file path
      const fullPath = `${newFilePath}/${newFileName}`;

      // Save the file using Tauri command
      const result = await invoke<TauriResult<string>>('save_file', {
        path: fullPath,
        content: content
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save file');
      }

      // Read the file back to get actual metadata
      const readResult = await invoke<TauriResult<any>>('read_file_smart', { 
        path: fullPath 
      });

      const fileResult: FileOpenResult = {
        path: fullPath,
        content: content,
        name: newFileName,
        size: readResult.data?.size || new Blob([content]).size,
        lastModified: new Date()
      };

      console.log('✅ File saved as:', fullPath);
      return fileResult;
    } catch (error) {
      console.error('❌ Failed to save file as:', error);
      throw error;
    }
  }

  /**
   * Opens a file and returns its content
   */
  async openFile(filePath: string): Promise<FileOpenResult> {
    try {
      if (!filePath.trim()) {
        throw new Error('File path cannot be empty');
      }

      // Read the file using Tauri command
      const result = await invoke<TauriResult<any>>('read_file_smart', { 
        path: filePath 
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to read file');
      }

      const data = result.data;
      
      if (data.is_too_large) {
        throw new Error('File is too large to open');
      }

      if (data.is_binary) {
        throw new Error('Cannot open binary file in text editor');
      }

      if (!data.content) {
        throw new Error('File has no readable content');
      }

      const fileResult: FileOpenResult = {
        path: filePath,
        content: data.content,
        name: filePath.split('/').pop() || 'unknown',
        size: data.size || 0,
        lastModified: new Date()
      };

      console.log('✅ File opened successfully:', filePath);
      return fileResult;
    } catch (error) {
      console.error('❌ Failed to open file:', error);
      throw error;
    }
  }

  /**
   * Saves all modified files
   */
  async saveAllFiles(modifiedFiles: Array<{ path: string; content: string }>): Promise<void> {
    try {
      const savePromises = modifiedFiles.map(async (file) => {
        console.log('💾 Saving file:', file.path);
        
        // Use real Tauri file system API
        const result = await invoke<TauriResult<string>>('write_file', { 
          path: file.path, 
          content: file.content 
        });

        if (!result.success) {
          throw new Error(result.error || `Failed to save file: ${file.path}`);
        }

        console.log('✅ File saved:', file.path);
        
        // Add to recent files after successful save
        await this.addToRecentFiles(file.path);
        
        return result;
      });

      await Promise.all(savePromises);
      console.log('✅ All files saved successfully');
    } catch (error) {
      console.error('❌ Failed to save all files:', error);
      throw error;
    }
  }

  /**
   * Gets recent files from storage/history
   */
  async getRecentFiles(): Promise<string[]> {
    try {
      // Use real Tauri storage implementation with store plugin
      const result = await invoke<TauriResult<string[]>>('get_recent_files');
      
      if (result.success && result.data) {
        return result.data;
      }
      
      // Fallback to empty array if backend doesn't have recent files yet
      console.warn('No recent files found in backend, starting with empty list');
      return [];
    } catch (error) {
      console.error('❌ Failed to get recent files:', error);
      // Try localStorage as fallback
      try {
        const stored = localStorage.getItem('syntari_recent_files');
        return stored ? JSON.parse(stored) : [];
      } catch (parseError) {
        return [];
      }
    }
  }

  /**
   * Adds a file to the recent files list
   */
  async addToRecentFiles(filePath: string): Promise<void> {
    try {
      // Use real Tauri storage implementation
      const result = await invoke<TauriResult<void>>('add_recent_file', { 
        path: filePath 
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to add file to recent list');
      }

      console.log('📋 Added to recent files:', filePath);
      
      // Also update localStorage as backup
      try {
        const current = await this.getRecentFiles();
        const updated = [filePath, ...current.filter(p => p !== filePath)].slice(0, 10);
        localStorage.setItem('syntari_recent_files', JSON.stringify(updated));
      } catch (localError) {
        console.warn('Could not update localStorage backup:', localError);
      }
    } catch (error) {
      console.error('❌ Failed to add to recent files:', error);
      
      // Fallback to localStorage only
      try {
        const current = JSON.parse(localStorage.getItem('syntari_recent_files') || '[]');
        const updated = [filePath, ...current.filter((p: string) => p !== filePath)].slice(0, 10);
        localStorage.setItem('syntari_recent_files', JSON.stringify(updated));
        console.log('📋 Added to recent files (localStorage fallback):', filePath);
      } catch (fallbackError) {
        console.error('Even localStorage fallback failed:', fallbackError);
      }
    }
  }

  /**
   * Validates file operation before execution
   */
  validateFileOperation(operation: 'create' | 'save' | 'open', filePath: string): { valid: boolean; error?: string } {
    try {
      if (!filePath.trim()) {
        return { valid: false, error: `${operation} operation failed: File path cannot be empty` };
      }

      // Check for invalid characters in path
      const invalidChars = ['<', '>', ':', '"', '|', '?', '*'];
      const hasInvalidChars = invalidChars.some(char => filePath.includes(char));
      
      if (hasInvalidChars) {
        return { valid: false, error: `${operation} operation failed: File path contains invalid characters` };
      }

      // Check path length
      if (filePath.length > 260) { // Windows MAX_PATH limitation
        return { valid: false, error: `${operation} operation failed: File path is too long` };
      }

      // Operation-specific validations
      if (operation === 'create') {
        // Additional validations for file creation
        const fileName = filePath.split('/').pop() || '';
        if (!fileName.includes('.')) {
          console.warn('Creating file without extension:', fileName);
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `${operation} operation validation failed` };
    }
  }

  /**
   * Gets file type information from extension
   */
  getFileTypeInfo(fileName: string): { extension: string; language: string; isText: boolean } {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    const languageMap: { [key: string]: string } = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'txt': 'text',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'ps1': 'powershell',
      'dockerfile': 'dockerfile',
      'toml': 'toml',
      'ini': 'ini'
    };

    const textExtensions = new Set([
      'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala',
      'html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml', 'yml', 'md', 'txt', 'sql', 'sh', 'bash',
      'zsh', 'ps1', 'dockerfile', 'toml', 'ini', 'gitignore', 'env'
    ]);

    return {
      extension,
      language: languageMap[extension] || 'text',
      isText: textExtensions.has(extension) || !extension
    };
  }
} 