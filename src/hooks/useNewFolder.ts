// Syntari AI IDE - New Folder Creation Hook
// Manages folder creation with validation and conflict resolution

import { useState, useCallback } from 'react';

export interface NewFolderOptions {
  parentPath: string;
  folderName: string;
  createIntermediateDirs?: boolean;
}

export interface NewFolderResult {
  success: boolean;
  folderPath?: string;
  error?: string;
}

export interface NewFolderManager {
  isCreating: boolean;
  createFolder: (options: NewFolderOptions) => Promise<NewFolderResult>;
  validateFolderName: (name: string) => { isValid: boolean; error?: string };
  getValidFolderName: (baseName: string, parentPath: string) => Promise<string>;
}

export const useNewFolder = (): NewFolderManager => {
  const [isCreating, setIsCreating] = useState(false);

  const validateFolderName = useCallback((name: string): { isValid: boolean; error?: string } => {
    if (!name.trim()) {
      return { isValid: false, error: 'Folder name cannot be empty' };
    }

    if (name.length > 255) {
      return { isValid: false, error: 'Folder name is too long (max 255 characters)' };
    }

    // Check for invalid characters (including control characters)
    // eslint-disable-next-line no-control-regex
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(name)) {
      return { isValid: false, error: 'Folder name contains invalid characters' };
    }

    // Check for reserved names
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];
    
    if (reservedNames.includes(name.toUpperCase())) {
      return { isValid: false, error: 'Folder name is reserved by the system' };
    }

    // Check for names that end with period or space
    if (name.endsWith('.') || name.endsWith(' ')) {
      return { isValid: false, error: 'Folder name cannot end with a period or space' };
    }

    return { isValid: true };
  }, []);

  const getValidFolderName = useCallback(async (baseName: string, parentPath: string): Promise<string> => {
    const { invoke } = await import('@tauri-apps/api/core');

    let candidateName = baseName;
    let counter = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const fullPath = `${parentPath}/${candidateName}`;
      
      try {
        const result = await invoke<{ success: boolean; data?: string }>('file_exists', {
          path: fullPath
        });
        
        const exists = result.success && (result.data?.includes('Exists: true') || false);
        if (!exists) {
          return candidateName;
        }
        
        // Try next name
        candidateName = `${baseName} (${counter})`;
        counter++;
        
        // Prevent infinite loop
        if (counter > 1000) {
          throw new Error('Too many folders with similar names');
        }
      } catch (error) {
        console.error('Error checking folder existence:', error);
        // Fallback to timestamped name
        return `${baseName}_${Date.now()}`;
      }
    }
  }, []);

  const createFolder = useCallback(async (options: NewFolderOptions): Promise<NewFolderResult> => {
    const { parentPath, folderName, createIntermediateDirs = false } = options;

    setIsCreating(true);

    try {
      // Validate folder name
      const validation = validateFolderName(folderName);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Import Tauri invoke for direct file system operations
      const { invoke } = await import('@tauri-apps/api/core');

      // Check if parent directory exists
      const parentCheckResult = await invoke<{ success: boolean; data?: string }>('file_exists', {
        path: parentPath
      });
      const parentExists = parentCheckResult.success && (parentCheckResult.data?.includes('Exists: true') || false);
      
      if (!parentExists) {
        if (createIntermediateDirs) {
          // Create parent directories first
          const createParentResult = await invoke<string>('create_dir_all', { path: parentPath });
          console.log('Created parent directories:', createParentResult);
        } else {
          return {
            success: false,
            error: `Parent directory does not exist: ${parentPath}`
          };
        }
      }

      const fullPath = `${parentPath}/${folderName}`;

      // Check if folder already exists
      const folderCheckResult = await invoke<{ success: boolean; data?: string }>('file_exists', {
        path: fullPath
      });
      const folderExists = folderCheckResult.success && (folderCheckResult.data?.includes('Exists: true') || false);
      
      if (folderExists) {
        return {
          success: false,
          error: `Folder already exists: ${folderName}`
        };
      }

      // Create the folder
      const createResult = await invoke<string>('create_directory', { path: fullPath });
      console.log('Created folder:', createResult);

      return {
        success: true,
        folderPath: fullPath
      };

    } catch (error) {
      console.error('Failed to create folder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    } finally {
      setIsCreating(false);
    }
  }, [validateFolderName]);

  return {
    isCreating,
    createFolder,
    validateFolderName,
    getValidFolderName
  };
}; 