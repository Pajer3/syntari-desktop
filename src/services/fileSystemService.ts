// Syntari AI IDE - VS Code-style File System Service
// High-performance filesystem operations with intelligent caching

import type { 
  FileNode, 
  FileSystemService, 
  FileSystemSnapshot, 
  FileSystemDiff, 
  FileWatchEvent, 
  ScanOptions,
  FileSystemCache,
  FileSystemMetrics
} from '../types/fileSystem';
import { invoke } from '@tauri-apps/api/core';

// Environment detection
const isWebEnvironment = () => {
  return typeof window !== 'undefined' && !(window as any).__TAURI_INTERNALS__;
};

// Web File System Access API compatibility layer
class WebFileSystemCompat {
  private dirHandle: any = null;
  
  setDirectoryHandle(handle: any) {
    this.dirHandle = handle;
    (window as any).__SYNTARI_DIR_HANDLE__ = handle;
  }
  
  getDirectoryHandle(): any {
    return this.dirHandle || (window as any).__SYNTARI_DIR_HANDLE__;
  }
  
  async readDirectoryContents(dirHandle: any): Promise<FileNode[]> {
    const files: FileNode[] = [];
    
    for await (const [name, handle] of dirHandle.entries()) {
      const isDirectory = handle.kind === 'directory';
      const path = `${dirHandle.name}/${name}`;
      
      let size = 0;
      let lastModified = Date.now();
      
      if (!isDirectory) {
        try {
          const file = await handle.getFile();
          size = file.size;
          lastModified = file.lastModified;
        } catch (error) {
          console.warn('Could not get file info:', error);
        }
      }
      
      files.push({
        id: this.generateId(path),
        path,
        name,
        size,
        isDirectory,
        lastModified: new Date(lastModified).getTime(),
        extension: isDirectory ? '' : this.getFileExtension(name),
        iconId: this.getIconId(isDirectory ? '' : this.getFileExtension(name), isDirectory),
        depth: 1, // Web API typically works with single level
        children: isDirectory ? [] : undefined,
        hasChildren: isDirectory,
        isExpanded: false,
        permissions: 'rw-r--r--', // Default permissions for web
        canRead: true,
        canWrite: true,
        canExecute: false,
        isHidden: name.startsWith('.'),
        isGitIgnored: false,
        isSymlink: false,
        isWatched: false,
        metadata: {
          handle: handle
        }
      });
    }
    
    return files.sort((a, b) => {
      // Directories first, then files, both alphabetically
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }
  
  async readFile(fileHandle: any): Promise<string> {
    const file = await fileHandle.getFile();
    return await file.text();
  }
  
  async writeFile(fileHandle: any, content: string): Promise<void> {
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }
  
  private generateId(path: string): string {
    return btoa(path).replace(/[^a-zA-Z0-9]/g, '');
  }
  
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }
  
  private getIconId(extension: string, isDirectory: boolean): string {
    if (isDirectory) return 'folder';
    return ICON_MAP.get(extension.toLowerCase()) || 'file';
  }
}

// ============================================================================
// EXTRACTED CACHE SERVICE - Better separation of concerns
// ============================================================================

/**
 * Dedicated file system cache service using localStorage with LRU eviction
 * Extracted from main service for better maintainability
 */
class FileSystemCacheService implements FileSystemCache {
  private readonly maxEntries = 10; // Keep last 10 workspaces
  private readonly cachePrefix = 'fs-cache-';
  private readonly orderKey = 'fs-cache-order';
  
  async save(snapshot: FileSystemSnapshot): Promise<void> {
    try {
      const key = `${this.cachePrefix}${this.hashPath(snapshot.rootPath)}`;
      const data = this.serialize(snapshot);
      localStorage.setItem(key, data);
      this.updateAccessOrder(key);
    } catch (error) {
      console.warn('Cache save failed:', error);
    }
  }
  
  async load(rootPath: string): Promise<FileSystemSnapshot | null> {
    try {
      const key = `${this.cachePrefix}${this.hashPath(rootPath)}`;
      const data = localStorage.getItem(key);
      if (!data) return null;
      
      this.updateAccessOrder(key);
      return this.deserialize(data);
    } catch (error) {
      console.warn('Cache load failed:', error);
      return null;
    }
  }
  
  async isValid(snapshot: FileSystemSnapshot, rootPath: string): Promise<boolean> {
    try {
      const result = await invoke<{ mtime: number; success: boolean }>('get_directory_mtime', { path: rootPath });
      if (!result.success) return false;
      
      const age = Date.now() - snapshot.timestamp;
      const maxAge = 5 * 60 * 1000; // 5 minutes
      
      return age < maxAge && Math.abs(result.mtime - snapshot.timestamp) < 1000;
    } catch {
      return false;
    }
  }
  
  async clear(): Promise<void> {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.cachePrefix));
    keys.forEach(key => localStorage.removeItem(key));
    localStorage.removeItem(this.orderKey);
  }
  
  getStats(): { entries: number; size: number } {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.cachePrefix));
    const size = keys.reduce((total, key) => total + (localStorage.getItem(key)?.length || 0), 0);
    return { entries: keys.length, size };
  }
  
  // Private helper methods for cache operations
  private hashPath(path: string): string {
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
      const char = path.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  
  private serialize(snapshot: FileSystemSnapshot): string {
    return JSON.stringify(snapshot);
  }
  
  private deserialize(data: string): FileSystemSnapshot {
    return JSON.parse(data);
  }
  
  private updateAccessOrder(key: string): void {
    const accessOrder = JSON.parse(localStorage.getItem(this.orderKey) || '[]');
    const index = accessOrder.indexOf(key);
    
    if (index !== -1) accessOrder.splice(index, 1);
    accessOrder.unshift(key);
    
    // LRU eviction
    while (accessOrder.length > this.maxEntries) {
      const oldKey = accessOrder.pop();
      localStorage.removeItem(oldKey);
    }
    
    localStorage.setItem(this.orderKey, JSON.stringify(accessOrder));
  }
}

// Icon mapping with sprite sheet support
const ICON_MAP = new Map<string, string>([
  // Directories
  ['directory', 'folder'],
  ['directory-open', 'folder-open'],
  // Programming languages
  ['.ts', 'typescript'],
  ['.tsx', 'tsx'],
  ['.js', 'javascript'],
  ['.jsx', 'jsx'],
  ['.rs', 'rust'],
  ['.py', 'python'],
  ['.go', 'go'],
  ['.java', 'java'],
  ['.c', 'c'],
  ['.cpp', 'cpp'],
  ['.h', 'header'],
  ['.hpp', 'header'],
  ['.cs', 'csharp'],
  // Web technologies
  ['.html', 'html'],
  ['.css', 'css'],
  ['.scss', 'sass'],
  ['.sass', 'sass'],
  ['.less', 'less'],
  ['.vue', 'vue'],
  ['.svelte', 'svelte'],
  // Data formats
  ['.json', 'json'],
  ['.xml', 'xml'],
  ['.yaml', 'yaml'],
  ['.yml', 'yaml'],
  ['.toml', 'toml'],
  ['.ini', 'config'],
  // Documentation
  ['.md', 'markdown'],
  ['.txt', 'text'],
  ['.pdf', 'pdf'],
  // Images
  ['.png', 'image'],
  ['.jpg', 'image'],
  ['.jpeg', 'image'],
  ['.gif', 'image'],
  ['.svg', 'image'],
  ['.webp', 'image'],
  // Default
  ['', 'file']
]);

export class VSCodeLikeFileSystemService implements FileSystemService {
  // Extracted services for better separation of concerns
  private cache = new FileSystemCacheService();
  private iconCache = new Map<string, string>();
  private folderContentsCache = new Map<string, FileNode[]>();
  private lastRefreshTime = Date.now();
  
  // Web browser compatibility layer
  public webCompat = new WebFileSystemCompat();
  
  // Performance metrics tracking
  private metrics = {
    scanTime: 0,
    nodeCount: 0,
    cacheHitRate: 0,
    memoryUsage: 0
  };
  
  // VS Code-style INSTANT loading - only root level initially
  async* scanDirectory(path: string, options: ScanOptions = {
    chunkSize: 50,
    ignorePatterns: [],
    includeHidden: false
  }): AsyncIterableIterator<FileNode[]> {
    const startTime = performance.now();
    
    try {
      // Load root level items (VS Code style)
      const result = await invoke<{
        success: boolean;
        data?: Array<{
          path: string;
          name: string;
          depth: number;
          size: number;
          last_modified: number;
          extension: string;
          is_directory: boolean;
        }>;
        error?: string;
      }>('load_root_items', { 
        rootPath: path,
        includeHidden: options.includeHidden,
        showHiddenFolders: true
      });
      
      if (result.success && result.data && result.data.length > 0) {
        const rootItems: FileNode[] = result.data.map(item => ({
          id: this.generateId(item.path),
          path: item.path,
          name: item.name,
          depth: item.depth,
          isDirectory: item.is_directory,
          size: item.is_directory ? undefined : item.size,
          lastModified: item.last_modified,
          extension: item.extension,
          iconId: this.getIconId(item.extension, item.is_directory),
          hasChildren: item.is_directory,
          isExpanded: false,
          children: undefined
        }));
        
        this.metrics.nodeCount = rootItems.length;
        yield rootItems;
        return;
      } else {
        console.warn('❌ No data returned from backend:', result.error);
        yield [];
        return;
      }
      
    } catch (error) {
      console.error('❌ VS Code root scan failed:', error);
      yield [];
    } finally {
      this.metrics.scanTime = performance.now() - startTime;
    }
  }
  
  // VS Code-style lazy folder expansion
  async loadFolderContents(folderPath: string, includeHidden: boolean = false): Promise<FileNode[]> {
    // Check cache first
    const cacheKey = `${folderPath}:${includeHidden}`;
    if (this.folderContentsCache.has(cacheKey)) {
      return this.folderContentsCache.get(cacheKey)!;
    }

    // Check if we're in web environment
    if (isWebEnvironment()) {
      return this.loadFolderContentsWeb(folderPath, includeHidden);
    }

    return this.loadDirectoryContents('load_folder_contents', {
      folderPath: folderPath,
      includeHidden: includeHidden,
      showHiddenFolders: true
    }, cacheKey, folderPath);
  }

  // VS Code-style root project loading
  async loadRootItems(rootPath: string, includeHidden: boolean = true): Promise<FileNode[]> {
    // Check cache first
    const cacheKey = `root:${rootPath}:${includeHidden}`;
    
    if (this.folderContentsCache.has(cacheKey)) {
      return this.folderContentsCache.get(cacheKey)!;
    }

    // Use web-compatible loading if in browser environment
    if (isWebEnvironment()) {
      return this.loadFolderContentsWeb(rootPath, includeHidden);
    }

    return this.loadDirectoryContents('load_root_items', {
      rootPath: rootPath,
      includeHidden: includeHidden,
      showHiddenFolders: true
    }, cacheKey, rootPath);
  }

  // Web-compatible folder loading using File System Access API
  private async loadFolderContentsWeb(folderPath: string, includeHidden: boolean = false): Promise<FileNode[]> {
    try {
      const dirHandle = this.webCompat.getDirectoryHandle();
      
      if (!dirHandle) {
        throw new Error('No directory handle available. Please select a project folder first.');
      }

      // If folderPath is different from root, navigate to subfolder
      let targetHandle = dirHandle;
      if (folderPath !== dirHandle.name && folderPath.includes('/')) {
        const pathParts = folderPath.split('/').filter(part => part && part !== dirHandle.name);
        
        for (const part of pathParts) {
          try {
            targetHandle = await targetHandle.getDirectoryHandle(part);
          } catch (error) {
            console.warn(`Could not access folder ${part}:`, error);
            throw new Error(`Cannot access folder: ${folderPath}`);
          }
        }
      }

      const files = await this.webCompat.readDirectoryContents(targetHandle);
      
      // Filter hidden files if needed
      const filteredFiles = includeHidden 
        ? files 
        : files.filter(file => !file.name.startsWith('.'));

      // Cache the results
      const cacheKey = `${folderPath}:${includeHidden}`;
      this.folderContentsCache.set(cacheKey, filteredFiles);

      return filteredFiles;
    } catch (error) {
      console.error('❌ Failed to load folder contents in web environment:', error);
      throw error instanceof Error ? error : new Error(`Failed to load folder: ${folderPath}`);
    }
  }

  // Unified directory loading with consistent error handling and transformation
  private async loadDirectoryContents(
    command: 'load_folder_contents' | 'load_root_items',
    params: Record<string, any>,
    cacheKey: string,
    pathForLogging: string
  ): Promise<FileNode[]> {
    try {
      const result = await invoke<{
        success: boolean;
        data?: Array<{
          path: string;
          name: string;
          depth: number;
          size: number;
          last_modified: number;
          extension: string;
          is_directory: boolean;
        }>;
        error?: string;
      }>(command, params);
      
      if (result.success && result.data) {
        const items: FileNode[] = result.data.map(item => ({
          id: this.generateId(item.path),
          path: item.path,
          name: item.name,
          depth: item.depth,
          isDirectory: item.is_directory,
          size: item.is_directory ? undefined : item.size,
          lastModified: item.last_modified,
          extension: item.extension,
          iconId: this.getIconId(item.extension, item.is_directory),
          hasChildren: item.is_directory,
          isExpanded: false,
          children: undefined
        }));
        
        // Cache the results
        this.folderContentsCache.set(cacheKey, items);
        
        return items;
      } else {
        console.warn(`❌ Failed to ${command}:`, result.error);
        throw new Error(result.error || `Failed to load ${pathForLogging}`);
      }
    } catch (error) {
      console.error(`❌ Error in ${command}:`, error);
      throw error instanceof Error ? error : new Error(`Unknown error loading ${pathForLogging}`);
    }
  }
  
  async* watchDirectory(path: string): AsyncIterableIterator<FileWatchEvent> {
    try {
      // Start filesystem watcher via Tauri
      await invoke('start_file_watcher', { path });
      
      // Listen for events
      const { listen } = await import('@tauri-apps/api/event');
      await listen<FileWatchEvent>('file-system-event', (_event) => {
        // Events are yielded through async iterator
      });
      
      // This would be implemented as a proper async iterator
      // For now, just a placeholder
      yield* [];
      
    } catch (error) {
      console.error('Failed to start file watcher:', error);
    }
  }
  
  async getSnapshot(path: string): Promise<FileSystemSnapshot> {
    const cached = await this.cache.load(path);
    if (cached && await this.cache.isValid(cached, path)) {
      return cached;
    }
    
    // Build snapshot from fresh scan (root only for speed)
    const nodes: FileNode[] = [];
    for await (const chunk of this.scanDirectory(path)) {
      nodes.push(...chunk);
    }
    
    return {
      version: 1,
      timestamp: Date.now(),
      rootPath: path,
      checksum: this.calculateChecksum(nodes),
      nodes
    };
  }
  
  applyDiff(current: readonly FileNode[], diff: FileSystemDiff): readonly FileNode[] {
    const nodeMap = new Map(current.map(node => [node.path, node]));
    
    // Remove deleted files
    diff.removed.forEach(path => nodeMap.delete(path));
    
    // Add new files
    diff.added.forEach(node => nodeMap.set(node.path, node));
    
    // Update modified files
    diff.modified.forEach(node => nodeMap.set(node.path, node));
    
    // Handle moves
    diff.moved.forEach(({ from, to }) => {
      const node = nodeMap.get(from);
      if (node) {
        nodeMap.delete(from);
        nodeMap.set(to, { ...node, path: to, name: to.split('/').pop() || '' });
      }
    });
    
    // Convert back to sorted array
    return Array.from(nodeMap.values()).sort((a, b) => {
      // Directories first, then alphabetical
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }
  
  getMetrics(): FileSystemMetrics {
    return { 
      ...this.metrics,
      cacheHitRate: this.folderContentsCache.size > 0 ? 0.8 : 0 // Estimated
    };
  }
  
  private generateId(path: string): string {
    // Generate stable ID from path hash
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
      const char = path.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  
  private getIconId(extension: string, isDirectory: boolean): string {
    if (isDirectory) return 'folder';
    
    const cached = this.iconCache.get(extension);
    if (cached) return cached;
    
    const iconId = ICON_MAP.get(extension.toLowerCase()) || 'file';
    this.iconCache.set(extension, iconId);
    return iconId;
  }
  
  private calculateChecksum(nodes: readonly FileNode[]): string {
    // Simple checksum based on paths and modification times
    const data = nodes.map(n => `${n.path}:${n.lastModified}`).join('|');
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // Cache management methods
  clearFolderCache(folderPath: string): void {
    this.folderContentsCache.delete(folderPath);
  }

  /**
   * Invalidate all caches - useful when major file system changes occur
   */
  invalidateAllCaches(): void {
    this.folderContentsCache.clear();
    this.cache.clear(); // Clear the main cache as well
    this.lastRefreshTime = Date.now();
    console.log('🗑️ All file system caches invalidated');
  }

  /**
   * Invalidate cache for a specific path and its parent directories
   */
  invalidateCache(path: string): void {
    // Clear the specific path
    this.folderContentsCache.delete(path);
    
    // Clear parent directories up to root
    let currentPath = path;
    while (currentPath && currentPath !== '/') {
      this.folderContentsCache.delete(currentPath);
      const lastSlash = currentPath.lastIndexOf('/');
      if (lastSlash === -1) break;
      currentPath = currentPath.substring(0, lastSlash);
    }
    
    console.log(`🗑️ Cache invalidated for path: ${path} and its parents`);
  }

  // VS Code-style smart file reading with size guards
  async readFile(filePath: string): Promise<{
    content: string;
    size: number;
    isBinary: boolean;
    isTooLarge: boolean;
    shouldUseHexMode: boolean;
    warning?: string;
  }> {
    console.log('📖 Reading file:', filePath);
    
    try {
      const result = await invoke<{
        success: boolean;
        data?: {
          content?: string;
          size: number;
          is_binary: boolean;
          is_too_large: boolean;
          should_use_hex_mode: boolean;
          warning?: string;
        };
        error?: string;
      }>('read_file_smart', { path: filePath });
      
      if (result.success && result.data) {
        const data = result.data;
        return {
          content: data.content || '',
          size: data.size,
          isBinary: data.is_binary,
          isTooLarge: data.is_too_large,
          shouldUseHexMode: data.should_use_hex_mode,
          warning: data.warning
        };
      } else {
        throw new Error(result.error || `Failed to read file: ${filePath}`);
      }
    } catch (error) {
      console.error('❌ Error reading file:', error);
      throw error instanceof Error ? error : new Error(`Unknown error reading ${filePath}`);
    }
  }

  // Simple file reading for compatibility (throws on large/binary files)
  async readFileSimple(filePath: string): Promise<string> {
    console.log('📖 Reading file (simple):', filePath);
    
    // Check if we're in web environment
    if (isWebEnvironment()) {
      return this.readFileWeb(filePath);
    }
    
    try {
      const result = await invoke<{
        success: boolean;
        data?: string;
        error?: string;
      }>('read_file', { path: filePath });
      
      if (result.success && result.data !== undefined) {
        return result.data;
      } else {
        throw new Error(result.error || `Failed to read file: ${filePath}`);
      }
    } catch (error) {
      console.error('❌ Error reading file:', error);
      throw error instanceof Error ? error : new Error(`Unknown error reading ${filePath}`);
    }
  }

  // Web-compatible file reading
  private async readFileWeb(filePath: string): Promise<string> {
    try {
      const dirHandle = this.webCompat.getDirectoryHandle();
      if (!dirHandle) {
        throw new Error('No directory handle available. Please select a project folder first.');
      }

      // Navigate to the file
      const pathParts = filePath.split('/').filter(part => part && part !== dirHandle.name);
      let currentHandle = dirHandle;
      
      // Navigate through directories
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
      }
      
      // Get the file handle
      const fileName = pathParts[pathParts.length - 1];
      const fileHandle = await currentHandle.getFileHandle(fileName);
      
      return await this.webCompat.readFile(fileHandle);
    } catch (error) {
      console.error('❌ Failed to read file in web environment:', error);
      throw error instanceof Error ? error : new Error(`Failed to read file: ${filePath}`);
    }
  }

  // File saving
  async saveFile(filePath: string, content: string): Promise<void> {
    try {
      console.log('💾 Saving file:', filePath);
      
      // Check if we're in web environment
      if (isWebEnvironment()) {
        await this.saveFileWeb(filePath, content);
      } else {
        await invoke('write_file', {
          path: filePath,
          content: content
        });
      }
      
      console.log('✅ File saved successfully');
    } catch (error) {
      console.error('❌ Failed to save file:', error);
      throw new Error(`Failed to save file: ${error}`);
    }
  }

  // Web-compatible file saving
  private async saveFileWeb(filePath: string, content: string): Promise<void> {
    try {
      const dirHandle = this.webCompat.getDirectoryHandle();
      if (!dirHandle) {
        throw new Error('No directory handle available. Please select a project folder first.');
      }

      // Navigate to the file location
      const pathParts = filePath.split('/').filter(part => part && part !== dirHandle.name);
      let currentHandle = dirHandle;
      
      // Navigate through directories (create if needed)
      for (let i = 0; i < pathParts.length - 1; i++) {
        try {
          currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
        } catch (error) {
          // Directory doesn't exist, create it
          currentHandle = await currentHandle.getDirectoryHandle(pathParts[i], { create: true });
        }
      }
      
      // Get or create the file handle
      const fileName = pathParts[pathParts.length - 1];
      const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
      
      await this.webCompat.writeFile(fileHandle, content);
    } catch (error) {
      console.error('❌ Failed to save file in web environment:', error);
      throw error instanceof Error ? error : new Error(`Failed to save file: ${filePath}`);
    }
  }

  // Directory creation
  async createDirectory(dirPath: string): Promise<void> {
    try {
      console.log('📁 Creating directory:', dirPath);
      
      await invoke('create_directory', {
        path: dirPath
      });
      
      // Clear cache for parent directory to show the new folder
      const parentPath = dirPath.substring(0, dirPath.lastIndexOf('/'));
      this.clearFolderCache(parentPath);
      
      console.log('✅ Directory created successfully:', dirPath);
    } catch (error) {
      console.error('❌ Failed to create directory:', error);
      throw new Error(`Failed to create directory: ${error}`);
    }
  }

  // Get all files recursively for QuickOpen feature
  async getAllFiles(rootPath: string): Promise<FileNode[]> {
    console.log('🔍 Loading all files for QuickOpen...');
    
    const allFiles: FileNode[] = [];
    const visited = new Set<string>();
    
    // Recursive file collection with depth and pattern limits
    const collectFiles = async (currentPath: string, depth: number = 0): Promise<void> => {
      // Prevent infinite loops and excessive depth
      if (visited.has(currentPath) || depth > 8) return;
      visited.add(currentPath);
      
      try {
        const items = await this.loadFolderContents(currentPath, false);
        
        for (const item of items) {
          if (!item.isDirectory) {
            // Add file to collection
            allFiles.push(item);
          } else if (depth < 8 && !this.shouldSkipDirectory(item.name)) {
            // Recursively scan subdirectory
            await collectFiles(item.path, depth + 1);
          }
        }
      } catch (error) {
        // Continue on permission errors or other issues
        console.warn(`⚠️ Skipping directory ${currentPath}:`, error);
      }
    };
    
    try {
      // Start with root directory
      await collectFiles(rootPath);
      
      // Sort files by path for consistent ordering
      allFiles.sort((a, b) => a.path.localeCompare(b.path));
      
      console.log(`🔍 Collected ${allFiles.length} files recursively for QuickOpen`);
      return allFiles;
      
    } catch (error) {
      console.error('❌ Error during recursive file collection:', error);
      
      // Final fallback: Just get root files
      try {
        const rootItems = await this.loadRootItems(rootPath, false);
        const filesOnly = rootItems.filter(item => !item.isDirectory);
        console.log(`🔍 Final fallback: Found ${filesOnly.length} root files for QuickOpen`);
        return filesOnly;
      } catch (fallbackError) {
        console.error('❌ All fallbacks failed:', fallbackError);
        return [];
      }
    }
  }

  // Helper to skip common directories that should not appear in QuickOpen
  private shouldSkipDirectory(dirName: string): boolean {
    const skipPatterns = [
      'node_modules',
      '.git',
      '.svn',
      '.hg',
      'target',        // Rust
      'build',
      'dist',
      '.next',         // Next.js
      '.nuxt',         // Nuxt.js
      '__pycache__',   // Python
      '.pytest_cache',
      'venv',
      '.venv',
      '.cargo',        // Rust
      '.gradle',       // Java
      '.maven',
      'vendor',        // Various package managers
      '.idea',         // JetBrains IDEs
      '.vscode',       // VS Code settings (optional)
      'coverage',
      '.nyc_output',
      '.DS_Store'
    ];
    
    return skipPatterns.includes(dirName) || dirName.startsWith('.');
  }

  // ================================
  // LIVE FILE SYSTEM UPDATES
  // ================================

  /**
   * Handle file system events from live watcher
   */
  handleFileSystemEvent(eventType: 'created' | 'modified' | 'deleted', path: string, isDirectory: boolean): void {
    // Only log important events, not every single one
    if (eventType !== 'modified' || Math.random() < 0.05) { // Log only 5% of modify events
      console.log(`🔄 Handling file system event: ${eventType} - ${path} (${isDirectory ? 'directory' : 'file'})`);
    }
    
    // For created/deleted events, invalidate more aggressively
    if (eventType === 'created' || eventType === 'deleted') {
      this.invalidateCache(path);
      
      // Also invalidate parent directory to show/hide the new/deleted item
      const parentPath = path.substring(0, path.lastIndexOf('/'));
      if (parentPath) {
        this.invalidateCache(parentPath);
      }
    } else {
      // For modified events, just invalidate the specific path
      const parentPath = path.substring(0, path.lastIndexOf('/'));
      if (parentPath) {
        this.invalidateCache(parentPath);
      }
    }
  }

  /**
   * Force refresh of a specific folder's contents
   */
  async refreshFolderContents(folderPath: string, includeHidden: boolean = false): Promise<FileNode[]> {
    console.log('🔄 Force refreshing folder contents:', folderPath);
    
    // Remove from cache to force fresh load
    this.folderContentsCache.delete(folderPath);
    
    // Load fresh contents
    return this.loadFolderContents(folderPath, includeHidden);
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { foldersCached: number; iconsCached: number; lastRefresh: number } {
    return {
      foldersCached: this.folderContentsCache.size,
      iconsCached: this.iconCache.size,
      lastRefresh: this.lastRefreshTime
    };
  }
}

// Singleton instance
export const fileSystemService = new VSCodeLikeFileSystemService(); 