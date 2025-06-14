// Syntari AI IDE - Context Menu Service
// Connects context menu actions to real functionality

import { invoke } from '@tauri-apps/api/core';
import { projectService } from './projectService';

export class ContextMenuService {
  private clipboard: { type: 'cut' | 'copy'; path: string } | null = null;
  private editorRef: any = null; // Monaco editor reference

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
    try {
      console.log('✂️ Cutting file to clipboard:', filePath);
      
      this.clipboard = { type: 'cut', path: filePath };
      
      const fileName = filePath.split('/').pop() || '';
      console.log(`Cut file: ${filePath}`);
      
      // Show user feedback
      alert(`✂️ Cut "${fileName}" to clipboard\n\nYou can now paste it in another location. The file will be moved when pasted.`);
      
    } catch (error) {
      console.error('❌ Cut operation failed:', error);
      alert('Failed to cut file');
      throw error;
    }
  }

  async copyFile(filePath: string): Promise<void> {
    try {
      console.log('📋 Copying file to clipboard:', filePath);
      
      this.clipboard = { type: 'copy', path: filePath };
      
      const fileName = filePath.split('/').pop() || '';
      console.log(`Copied file: ${filePath}`);
      
      // Show user feedback
      alert(`📋 Copied "${fileName}" to clipboard\n\nYou can now paste it in another location.`);
      
    } catch (error) {
      console.error('❌ Copy operation failed:', error);
      alert('Failed to copy file');
      throw error;
    }
  }

  async pasteFile(targetPath: string): Promise<void> {
    try {
      console.log('📄 Starting paste operation to:', targetPath);
      
      if (!this.clipboard) {
        alert('No file in clipboard. Please cut or copy a file first.');
        console.log('❌ No file in clipboard');
        return;
      }

      const sourcePath = this.clipboard.path;
      const fileName = sourcePath.split('/').pop() || '';
      const operation = this.clipboard.type;
      
      console.log(`📄 ${operation === 'cut' ? 'Moving' : 'Copying'} file: ${fileName}`);

      // Determine destination path
      let destPath: string;
      
      // Check if target is a directory
      if (targetPath.includes('.')) {
        // Target is a file, paste to its directory
        destPath = targetPath.substring(0, targetPath.lastIndexOf('/')) + '/' + fileName;
      } else {
        // Target is a directory
        destPath = `${targetPath}/${fileName}`;
      }

      console.log(`📄 ${operation === 'cut' ? 'Moving' : 'Copying'} from ${sourcePath} to ${destPath}`);

      if (operation === 'cut') {
        // Move file
        const result = await invoke<any>('move_file', {
          sourcePath: sourcePath,
          targetPath: destPath
        });

        // Backend returns TauriResult<String>
        if (result.success !== true) {
          throw new Error(result.error || 'Move failed');
        }

        console.log(`✅ Moved ${sourcePath} to ${destPath}`);
        alert(`✅ Moved "${fileName}" successfully`);
        this.clipboard = null; // Clear clipboard after cut
      } else {
        // Copy file
        const result = await invoke<any>('copy_file', {
          sourcePath: sourcePath,
          targetPath: destPath
        });

        if (result.success !== true) {
          throw new Error(result.error || 'Copy failed');
        }

        console.log(`✅ Copied ${sourcePath} to ${destPath}`);
        alert(`✅ Copied "${fileName}" successfully`);
      }

      // Refresh file tree
      window.dispatchEvent(new CustomEvent('file-tree-refresh'));
      console.log('🔄 File tree refresh event dispatched');

    } catch (error) {
      console.error('❌ Paste operation failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to paste file: ${errorMessage}`);
      
      throw error;
    }
  }

  async renameFile(filePath: string): Promise<void> {
    try {
      console.log('✏️ Starting rename operation for:', filePath);
      
      const currentName = filePath.split('/').pop() || '';
      
      // Create a better input dialog that won't cause visual buffering
      const newName = await this.showRenameDialog(currentName);
      
      if (!newName || newName === currentName) {
        console.log('🚫 Rename operation cancelled or no change');
        return;
      }

      if (!newName.trim()) {
        alert('Please enter a valid name');
        return;
      }

      console.log('✅ User provided new name:', newName);
      
      // Calculate new path
      const directory = filePath.substring(0, filePath.lastIndexOf('/'));
      const newPath = `${directory}/${newName.trim()}`;
      
      console.log('🔄 Renaming from:', filePath, 'to:', newPath);
      
      // Use backend move/rename command with camelCase parameters
      const result = await invoke<any>('move_file', { 
        sourcePath: filePath,  // camelCase as expected by Tauri
        targetPath: newPath    // camelCase as expected by Tauri
      });
      
      console.log('📋 Backend rename result:', result);
      
      if (result.success) {
        console.log(`✅ Renamed: ${currentName} → ${newName}`);
        
        // Refresh file tree
        window.dispatchEvent(new CustomEvent('file-tree-refresh'));
        console.log('🔄 File tree refresh event dispatched');
      } else {
        throw new Error(result.error || 'Rename operation failed');
      }

    } catch (error) {
      console.error('❌ Rename operation failed:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to rename: ${errorMessage}`);
      
      throw error;
    }
  }

  // Better rename dialog that won't cause visual buffering
  private showRenameDialog(currentName: string): Promise<string | null> {
    return new Promise((resolve) => {
      // Create a non-intrusive overlay dialog
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;

      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: #2d2d30;
        color: white;
        padding: 20px;
        border-radius: 6px;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      `;

      dialog.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #cccccc;">Rename File</h3>
        <input type="text" id="rename-input" value="${currentName}" 
               style="width: 100%; padding: 8px; background: #3c3c3c; color: white; border: 1px solid #555; border-radius: 3px; outline: none; margin-bottom: 15px;">
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="rename-cancel" style="padding: 6px 12px; background: #555; color: white; border: none; border-radius: 3px; cursor: pointer;">Cancel</button>
          <button id="rename-ok" style="padding: 6px 12px; background: #007ACC; color: white; border: none; border-radius: 3px; cursor: pointer;">Rename</button>
        </div>
      `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const input = dialog.querySelector('#rename-input') as HTMLInputElement;
      const okButton = dialog.querySelector('#rename-ok') as HTMLButtonElement;
      const cancelButton = dialog.querySelector('#rename-cancel') as HTMLButtonElement;

      // Focus and select text
      setTimeout(() => {
        input.focus();
        input.select();
      }, 10);

      const cleanup = () => {
        document.body.removeChild(overlay);
      };

      const handleOk = () => {
        const value = input.value.trim();
        cleanup();
        resolve(value || null);
      };

      const handleCancel = () => {
        cleanup();
        resolve(null);
      };

      // Event listeners
      okButton.addEventListener('click', handleOk);
      cancelButton.addEventListener('click', handleCancel);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleOk();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
        }
      });

      // Click outside to cancel
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          handleCancel();
        }
      });
    });
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      console.log('🗑️ Starting delete operation for:', filePath);
      
      // Show confirmation dialog
      const confirmed = confirm(`Are you sure you want to delete: ${filePath.split('/').pop()}?`);
      if (!confirmed) {
        console.log('🚫 Delete operation cancelled by user');
        return;
      }

      console.log('✅ User confirmed deletion, calling backend...');
      
      // Delete using backend
      const result = await invoke<any>('delete_file', { 
        path: filePath,
        force: false // Don't force delete for safety
      });
      
      console.log('📋 Backend delete result:', result);
      
      // Backend returns a string on success, throws on error
      console.log(`✅ Deleted file: ${filePath}`);
      
      // Refresh file tree
      window.dispatchEvent(new CustomEvent('file-tree-refresh'));
      
      console.log('🔄 File tree refresh event dispatched');

    } catch (error) {
      console.error('❌ Delete operation failed:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to delete file: ${errorMessage}`);
      
      throw error;
    }
  }

  async showFileProperties(filePath: string): Promise<void> {
    try {
      console.log('⚙️ Getting properties for:', filePath);
      
      // Get file stats
      const result = await invoke<any>('read_file_smart', { path: filePath });
      
      if (result.success && result.data) {
        const stats = result.data;
        const fileName = filePath.split('/').pop() || '';
        const directory = filePath.substring(0, filePath.lastIndexOf('/'));
        
        // Format file size
        const formatFileSize = (bytes: number): string => {
          if (bytes === 0) return '0 Bytes';
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        // Create properties message
        const properties = [
          `File: ${fileName}`,
          `Location: ${directory}`,
          `Size: ${formatFileSize(stats.size)} (${stats.size.toLocaleString()} bytes)`,
          `Type: ${stats.is_binary ? 'Binary File' : 'Text File'}`,
          ``,
          `Full Path: ${filePath}`
        ].join('\n');
        
        console.log('📋 File properties:', properties);
        
        // Show properties dialog
        alert(`File Properties\n\n${properties}`);
        
      } else {
        throw new Error('Could not read file information');
      }
    } catch (error) {
      console.error('❌ Failed to get file properties:', error);
      
      // Show basic properties on error
      const fileName = filePath.split('/').pop() || '';
      const directory = filePath.substring(0, filePath.lastIndexOf('/'));
      
      const basicProperties = [
        `File: ${fileName}`,
        `Location: ${directory}`,
        `Full Path: ${filePath}`,
        ``,
        `(Detailed information unavailable)`
      ].join('\n');
      
      alert(`File Properties\n\n${basicProperties}`);
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
    if (this.editorRef) {
      // Use Monaco's trigger method to execute cut action
      this.editorRef.trigger('keyboard', 'editor.action.clipboardCutAction', null);
    } else {
      // Fallback to clipboard API
      this.copySelection();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        selection.deleteFromDocument();
      }
    }
  }

  copySelection(): void {
    if (this.editorRef) {
      // Use Monaco's trigger method to execute copy action
      this.editorRef.trigger('keyboard', 'editor.action.clipboardCopyAction', null);
    } else {
      // Fallback to clipboard API
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        navigator.clipboard.writeText(selection.toString()).catch(console.error);
      }
    }
  }

  pasteToEditor(): void {
    if (this.editorRef) {
      // Use Monaco's trigger method to execute paste action
      this.editorRef.trigger('keyboard', 'editor.action.clipboardPasteAction', null);
    } else {
      // Fallback - Monaco handles paste automatically when focused
      this.editorRef?.focus();
    }
  }

  selectAll(): void {
    if (this.editorRef) {
      // Use Monaco's trigger method to select all
      this.editorRef.trigger('keyboard', 'editor.action.selectAll', null);
    }
  }

  openFind(): void {
    if (this.editorRef) {
      // Use Monaco's built-in find action
      this.editorRef.trigger('keyboard', 'actions.find', null);
    }
  }

  openReplace(): void {
    if (this.editorRef) {
      // Use Monaco's built-in find and replace action
      this.editorRef.trigger('keyboard', 'editor.action.startFindReplaceAction', null);
    }
  }

  formatDocument(): void {
    if (this.editorRef) {
      // Use Monaco's built-in format document action
      this.editorRef.trigger('keyboard', 'editor.action.formatDocument', null);
    }
  }

  openAIAssistant(): void {
    // Open AI assistant with current context
    if (this.editorRef) {
      const selection = this.editorRef.getSelection();
      const selectedText = this.editorRef.getModel()?.getValueInRange(selection) || '';
      
      window.dispatchEvent(new CustomEvent('ai-assistant-open', {
        detail: { 
          selectedText,
          cursorPosition: this.editorRef.getPosition(),
          filePath: this.editorRef.getModel()?.uri?.path
        }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('ai-assistant-open'));
    }
  }

  // ================================
  // EDITOR REFERENCE MANAGEMENT
  // ================================

  setEditorRef(editor: any): void {
    this.editorRef = editor;
  }

  getEditorRef(): any {
    return this.editorRef;
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