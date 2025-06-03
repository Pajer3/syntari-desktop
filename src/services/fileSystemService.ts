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

// Cache implementation using localStorage with LRU eviction
class LocalFileSystemCache implements FileSystemCache {
  private readonly maxEntries = 10; // Keep last 10 workspaces
  
  async save(snapshot: FileSystemSnapshot): Promise<void> {
    try {
      const key = `fs-cache-${this.hashPath(snapshot.rootPath)}`;
      const compressed = this.compress(snapshot);
      localStorage.setItem(key, compressed);
      
      // Update access order for LRU
      this.updateAccessOrder(key);
    } catch (error) {
      console.warn('Failed to save filesystem cache:', error);
    }
  }
  
  async load(rootPath: string): Promise<FileSystemSnapshot | null> {
    try {
      const key = `fs-cache-${this.hashPath(rootPath)}`;
      const compressed = localStorage.getItem(key);
      if (!compressed) return null;
      
      this.updateAccessOrder(key);
      return this.decompress(compressed);
    } catch (error) {
      console.warn('Failed to load filesystem cache:', error);
      return null;
    }
  }
  
  async isValid(snapshot: FileSystemSnapshot, rootPath: string): Promise<boolean> {
    try {
      // Check if root directory modification time changed
      const result = await invoke<{ mtime: number; success: boolean }>('get_directory_mtime', { path: rootPath });
      if (!result.success) return false;
      
      // Consider valid if less than 5 minutes old and mtime unchanged
      const age = Date.now() - snapshot.timestamp;
      const maxAge = 5 * 60 * 1000; // 5 minutes
      
      return age < maxAge && Math.abs(result.mtime - snapshot.timestamp) < 1000;
    } catch {
      return false;
    }
  }
  
  async clear(): Promise<void> {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('fs-cache-'));
    keys.forEach(key => localStorage.removeItem(key));
  }
  
  private hashPath(path: string): string {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
      const char = path.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  private compress(snapshot: FileSystemSnapshot): string {
    // Simple JSON compression - could use LZ-string for better compression
    return JSON.stringify(snapshot);
  }
  
  private decompress(data: string): FileSystemSnapshot {
    return JSON.parse(data);
  }
  
  private updateAccessOrder(key: string): void {
    const accessOrder = JSON.parse(localStorage.getItem('fs-cache-order') || '[]');
    const index = accessOrder.indexOf(key);
    
    if (index !== -1) {
      accessOrder.splice(index, 1);
    }
    accessOrder.unshift(key);
    
    // Evict old entries
    while (accessOrder.length > this.maxEntries) {
      const oldKey = accessOrder.pop();
      localStorage.removeItem(oldKey);
    }
    
    localStorage.setItem('fs-cache-order', JSON.stringify(accessOrder));
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
  private cache = new LocalFileSystemCache();
  private iconCache = new Map<string, string>();
  private folderContentsCache = new Map<string, FileNode[]>(); // Cache loaded folder contents
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
      console.log('🚀 VS Code INSTANT scan - root only:', path);
      
      // Load ONLY root level items (VS Code style) - call backend directly
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
        showHiddenFolders: true  // Show all folders including __pycache__, node_modules, etc.
      });
      
      console.log('📋 Backend response:', result);
      
      if (result.success && result.data && result.data.length > 0) {
        // Convert to FileNode format
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
          isExpanded: false, // All folders start collapsed
          children: undefined // Lazy loaded when expanded
        }));
        
        console.log(`⚡ INSTANT root load: ${rootItems.length} items (${rootItems.filter(n => n.isDirectory).length} dirs, ${rootItems.filter(n => !n.isDirectory).length} files)`);
        
        this.metrics.nodeCount = rootItems.length;
        yield rootItems;
        return;
      } else {
        console.warn('❌ No data returned from backend:', result.error);
        // Yield empty array if no data
        yield [];
        return;
      }
      
    } catch (error) {
      console.error('❌ VS Code root scan failed:', error);
      // Yield empty array to prevent UI blocking
      yield [];
    } finally {
      this.metrics.scanTime = performance.now() - startTime;
      console.log(`⏱️ Instant scan time: ${this.metrics.scanTime.toFixed(2)}ms`);
    }
  }
  
  // VS Code-style lazy folder expansion
  async loadFolderContents(folderPath: string, includeHidden: boolean = false): Promise<FileNode[]> {
    console.log('📁 VS Code lazy load folder:', folderPath);
    
    // Check cache first
    const cacheKey = `${folderPath}:${includeHidden}`;
    if (this.folderContentsCache.has(cacheKey)) {
      console.log('🎯 Cache hit for folder:', folderPath);
      return this.folderContentsCache.get(cacheKey)!;
    }

    return this.loadDirectoryContents('load_folder_contents', {
      folderPath: folderPath,
      includeHidden: includeHidden,
      showHiddenFolders: true
    }, cacheKey, folderPath);
  }

  // VS Code-style root project loading
  async loadRootItems(rootPath: string, includeHidden: boolean = true): Promise<FileNode[]> {
    console.log('🚀 VS Code instant root load for path:', rootPath);
    
    // Check cache first
    const cacheKey = `root:${rootPath}:${includeHidden}`;
    if (this.folderContentsCache.has(cacheKey)) {
      console.log('🎯 Cache hit for root:', rootPath);
      return this.folderContentsCache.get(cacheKey)!;
    }

    return this.loadDirectoryContents('load_root_items', {
      rootPath: rootPath,
      includeHidden: includeHidden,
      showHiddenFolders: true
    }, cacheKey, rootPath);
  }

  // Unified directory loading with consistent error handling and transformation
  private async loadDirectoryContents(
    command: 'load_folder_contents' | 'load_root_items',
    params: Record<string, any>,
    cacheKey: string,
    pathForLogging: string
  ): Promise<FileNode[]> {
    try {
      console.log(`📁 Loading ${command} for:`, pathForLogging);
      console.log('📁 Parameters:', params);
      
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
      
      console.log(`📋 ${command} response:`, result);
      
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
        console.log(`✅ Loaded ${items.length} items from ${pathForLogging}`);
        
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

  // Clear folder cache when needed
  clearFolderCache(folderPath?: string): void {
    if (folderPath) {
      // Clear specific folder and its children
      const keysToDelete = Array.from(this.folderContentsCache.keys())
        .filter(key => key.startsWith(folderPath));
      keysToDelete.forEach(key => this.folderContentsCache.delete(key));
    } else {
      // Clear all
      this.folderContentsCache.clear();
    }
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

  // File saving
  async saveFile(filePath: string, content: string): Promise<void> {
    try {
      console.log('💾 Saving file:', filePath);
      
      await invoke('write_file', {
        path: filePath,
        content: content
      });
      
      console.log('✅ File saved successfully');
    } catch (error) {
      console.error('❌ Failed to save file:', error);
      throw new Error(`Failed to save file: ${error}`);
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
}

// Singleton instance
export const fileSystemService = new VSCodeLikeFileSystemService(); 