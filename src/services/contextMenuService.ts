// Syntari AI IDE - Context Menu Service
// Connects context menu actions to real functionality

import { invoke } from '@tauri-apps/api/core';
import { projectService } from './projectService';

export class ContextMenuService {
  private clipboard: { type: 'cut' | 'copy'; path: string } | null = null;

  // ================================
  // FILE OPERATIONS
  // ================================

  async openFile(filePath: string): Promise<void> {
    try {
      // Open file in editor
      const content = await projectService.readFile(filePath);
      console.log(`Opening file: ${filePath}`);
      
      // Emit file open event
      window.dispatchEvent(new CustomEvent('file-open', {
        detail: { path: filePath, content }
      }));
    } catch (error) {
      console.error('Failed to open file:', error);
      throw error;
    }
  }

  async openFolder(folderPath: string): Promise<void> {
    try {
      console.log(`Opening folder: ${folderPath}`);
      
      // Emit folder open event
      window.dispatchEvent(new CustomEvent('folder-open', {
        detail: { path: folderPath }
      }));
    } catch (error) {
      console.error('Failed to open folder:', error);
      throw error;
    }
  }

  async cutFile(filePath: string): Promise<void> {
    this.clipboard = { type: 'cut', path: filePath };
    console.log(`Cut file: ${filePath}`);
    
    // Visual feedback - could emit event to show file as "cut"
    window.dispatchEvent(new CustomEvent('file-cut', {
      detail: { path: filePath }
    }));
  }

  async copyFile(filePath: string): Promise<void> {
    this.clipboard = { type: 'copy', path: filePath };
    console.log(`Copied file: ${filePath}`);
    
    window.dispatchEvent(new CustomEvent('file-copied', {
      detail: { path: filePath }
    }));
  }

  async pasteFile(targetPath: string): Promise<void> {
    if (!this.clipboard) {
      console.warn('Nothing to paste');
      return;
    }

    try {
      const { type, path: sourcePath } = this.clipboard;
      const fileName = sourcePath.split('/').pop() || 'file';
      const destPath = `${targetPath}/${fileName}`;

      if (type === 'copy') {
        // Copy file using backend
        const result = await invoke<any>('copy_file', {
          source_path: sourcePath,
          target_path: destPath
        });

        // Backend returns TauriResult<String>
        if (result.success !== true) {
          throw new Error(result.error || 'Copy failed');
        }

        console.log(`Copied ${sourcePath} to ${destPath}`);
      } else if (type === 'cut') {
        // Move file using backend
        const result = await invoke<any>('move_file', {
          source_path: sourcePath,
          target_path: destPath
        });

        // Backend returns TauriResult<String>
        if (result.success !== true) {
          throw new Error(result.error || 'Move failed');
        }

        console.log(`Moved ${sourcePath} to ${destPath}`);
        this.clipboard = null; // Clear clipboard after cut
      }

      // Refresh file tree
      window.dispatchEvent(new CustomEvent('file-tree-refresh'));

    } catch (error) {
      console.error('Paste operation failed:', error);
      throw error;
    }
  }

  async renameFile(filePath: string): Promise<void> {
    try {
      // Emit rename event - UI should handle the input dialog
      window.dispatchEvent(new CustomEvent('file-rename-request', {
        detail: { path: filePath }
      }));
    } catch (error) {
      console.error('Rename operation failed:', error);
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      // Show confirmation dialog
      const confirmed = confirm(`Are you sure you want to delete: ${filePath.split('/').pop()}?`);
      if (!confirmed) return;

      // Delete using backend
      await invoke<any>('delete_file', { path: filePath });
      
      // Backend returns a string on success, throws on error
      console.log(`Deleted file: ${filePath}`);
      
      // Refresh file tree
      window.dispatchEvent(new CustomEvent('file-tree-refresh'));

    } catch (error) {
      console.error('Delete operation failed:', error);
      throw error;
    }
  }

  async showFileProperties(filePath: string): Promise<void> {
    try {
      // Get file stats
      const result = await invoke<any>('read_file_smart', { path: filePath });
      
      if (result.success && result.data) {
        const stats = result.data;
        
        // Emit properties event
        window.dispatchEvent(new CustomEvent('file-properties', {
          detail: { 
            path: filePath,
            size: stats.size,
            modified: new Date().toISOString(), // Backend doesn't provide modified time
            permissions: 'rw-r--r--' // Default permissions
          }
        }));
      }
    } catch (error) {
      console.error('Failed to get file properties:', error);
    }
  }

  async openWith(filePath: string, application: string): Promise<void> {
    try {
      switch (application) {
        case 'text':
          // Open as plain text
          await this.openFile(filePath);
          break;
          
        case 'code':
          // Open with syntax highlighting
          await this.openFile(filePath);
          break;
          
        case 'system':
          // Open with system default (using Tauri shell)
          console.log(`Opening ${filePath} with system default`);
          break;
          
        default:
          await this.openFile(filePath);
      }
    } catch (error) {
      console.error('Open with failed:', error);
      throw error;
    }
  }

  // ================================
  // TAB OPERATIONS
  // ================================

  closeTab(tabIndex: number): void {
    window.dispatchEvent(new CustomEvent('tab-close', {
      detail: { index: tabIndex }
    }));
  }

  closeOtherTabs(tabIndex: number): void {
    window.dispatchEvent(new CustomEvent('tab-close-others', {
      detail: { keepIndex: tabIndex }
    }));
  }

  closeTabsToRight(tabIndex: number): void {
    window.dispatchEvent(new CustomEvent('tab-close-to-right', {
      detail: { fromIndex: tabIndex }
    }));
  }

  toggleTabPin(tabIndex: number): void {
    window.dispatchEvent(new CustomEvent('tab-toggle-pin', {
      detail: { index: tabIndex }
    }));
  }

  splitTabRight(tabIndex: number): void {
    window.dispatchEvent(new CustomEvent('tab-split-right', {
      detail: { index: tabIndex }
    }));
  }

  splitTabDown(tabIndex: number): void {
    window.dispatchEvent(new CustomEvent('tab-split-down', {
      detail: { index: tabIndex }
    }));
  }

  // ================================
  // EDITOR OPERATIONS
  // ================================

  cutSelection(): void {
    document.execCommand('cut');
  }

  copySelection(): void {
    document.execCommand('copy');
  }

  pasteToEditor(): void {
    document.execCommand('paste');
  }

  selectAll(): void {
    document.execCommand('selectAll');
  }

  openFind(): void {
    // Monaco editor find widget
    window.dispatchEvent(new CustomEvent('editor-find'));
  }

  openReplace(): void {
    // Monaco editor replace widget
    window.dispatchEvent(new CustomEvent('editor-replace'));
  }

  formatDocument(): void {
    // Monaco editor format
    window.dispatchEvent(new CustomEvent('editor-format'));
  }

  openAIAssistant(): void {
    // Open AI assistant with current context
    window.dispatchEvent(new CustomEvent('ai-assistant-open'));
  }

  // ================================
  // UTILITY METHODS
  // ================================

  getClipboardStatus(): { type: 'cut' | 'copy'; path: string } | null {
    return this.clipboard;
  }

  clearClipboard(): void {
    this.clipboard = null;
  }
}

// Export singleton instance
export const contextMenuService = new ContextMenuService(); 