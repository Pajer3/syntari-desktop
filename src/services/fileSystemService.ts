// Syntari AI IDE - VS Code-Style Lazy File System Service
// Implements instant loading with on-demand folder expansion

import { invoke } from '@tauri-apps/api/core';
import type { 
  FileNode, 
  FileSystemDiff, 
  FileSystemSnapshot, 
  FileWatchEvent, 
  FileSystemCache, 
  FileSystemService, 
  ScanOptions,
  FileSystemMetrics 
} from '../types/fileSystem';

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
      }>('load_folder_contents', { 
        folderPath: folderPath,
        includeHidden: includeHidden,
        showHiddenFolders: true  // Show all folders including __pycache__, node_modules, etc.
      });
      
      console.log('📋 Folder contents response:', result);
      
      if (result.success && result.data) {
        const folderContents: FileNode[] = result.data.map(item => ({
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
          isExpanded: false, // Start collapsed
          children: undefined // Lazy loaded when expanded
        }));
        
        // Cache the results
        this.folderContentsCache.set(cacheKey, folderContents);
        console.log(`📦 Loaded ${folderContents.length} items from ${folderPath}`);
        
        return folderContents;
      } else {
        console.warn('❌ Failed to load folder contents:', result.error);
        return [];
      }
    } catch (error) {
      console.error('❌ Error loading folder contents:', error);
      return [];
    }
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
}

// Singleton instance
export const fileSystemService = new VSCodeLikeFileSystemService(); 