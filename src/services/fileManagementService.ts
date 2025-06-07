// Syntari AI IDE - File Management Service
// Professional file operations with error handling and validation

import { invoke } from '@tauri-apps/api/core';

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

interface TauriResult<T> {
  success: boolean;
  data?: T;
  error?: string;
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
   * Check if a file exists on the filesystem
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const result = await invoke<{ success: boolean; data?: string }>('file_exists', {
        path: filePath
      });
      
      return result.success && (result.data?.includes('Exists: true') || false);
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  /**
   * Creates a new file with the specified name and content
   */
  async createFile(options: FileCreateOptions): Promise<FileOpenResult> {
    try {
      const { fileName, content = '', path = '', overwrite = false } = options;
      
      // Validate file name
      if (!fileName.trim()) {
        throw new Error('File name cannot be empty');
      }

      // Construct full file path
      const fullPath = path ? `${path}/${fileName}` : fileName;

      // Check if file already exists using actual filesystem
      const exists = await this.fileExists(fullPath);
      
      if (exists && !overwrite) {
        throw new Error(`File '${fileName}' already exists`);
      }

      // Create the file using Tauri command
      const result = await invoke<string>('create_file', {
        path: fullPath,
        content: content
      });
      
      console.log('✅ File creation result:', result);

      // Read the file back to get actual metadata
      const readResult = await invoke<TauriResult<any>>('read_file_smart', { 
        path: fullPath 
      });

      if (!readResult.success || !readResult.data) {
        throw new Error('Failed to read created file');
      }

      const fileResult: FileOpenResult = {
        path: fullPath,
        content: content,
        name: fileName,
        size: readResult.data.size || new Blob([content]).size,
        lastModified: new Date()
      };

      console.log('✅ File created successfully:', fullPath);
      return fileResult;
    } catch (error) {
      console.error('❌ Failed to create file:', error);
      throw error;
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
        // TODO: Replace with actual file system API
        console.log('💾 Saving file:', file.path);
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            console.log('✅ File saved:', file.path);
            resolve();
          }, 100); // Simulate save delay
        });
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
      // TODO: Replace with actual storage implementation
      const mockRecentFiles = [
        '/project/src/components/App.tsx',
        '/project/src/utils/helpers.ts',
        '/project/README.md',
        '/project/package.json',
        '/project/src/styles/globals.css'
      ];

      return mockRecentFiles;
    } catch (error) {
      console.error('❌ Failed to get recent files:', error);
      return [];
    }
  }

  /**
   * Adds a file to the recent files list
   */
  async addToRecentFiles(filePath: string): Promise<void> {
    try {
      // TODO: Replace with actual storage implementation
      console.log('📋 Added to recent files:', filePath);
    } catch (error) {
      console.error('❌ Failed to add to recent files:', error);
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