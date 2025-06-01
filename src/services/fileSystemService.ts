// Syntari AI IDE - High-Performance File System Service
// Implements chunked scanning, caching, and real-time updates

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

export class HighPerformanceFileSystemService implements FileSystemService {
  private cache = new LocalFileSystemCache();
  private iconCache = new Map<string, string>();
  private metrics = {
    scanTime: 0,
    nodeCount: 0,
    cacheHitRate: 0,
    memoryUsage: 0
  };
  
  async* scanDirectory(path: string, options: ScanOptions = {
    chunkSize: 100,
    ignorePatterns: ['.git', 'node_modules', '.DS_Store', 'target'],
    includeHidden: false
  }): AsyncIterableIterator<FileNode[]> {
    const startTime = performance.now();
    
    try {
      // Try cache first
      const snapshot = await this.cache.load(path);
      if (snapshot && await this.cache.isValid(snapshot, path)) {
        console.log('📦 Using cached filesystem snapshot');
        this.metrics.cacheHitRate = 1;
        yield snapshot.nodes.slice(); // Return all at once from cache
        return;
      }
      
      this.metrics.cacheHitRate = 0;
      console.log('🔍 Scanning filesystem (cache miss)');
      
      // Start with directory structure only for instant tree
      const directories = await this.scanDirectoriesFirst(path, options);
      if (directories.length > 0) {
        yield directories;
      }
      
      // Then scan files in chunks
      const allNodes: FileNode[] = [...directories];
      
      for await (const chunk of this.scanFilesChunked(path, options)) {
        allNodes.push(...chunk);
        yield chunk;
      }
      
      // Cache the complete result
      const finalSnapshot: FileSystemSnapshot = {
        version: 1,
        timestamp: Date.now(),
        rootPath: path,
        checksum: this.calculateChecksum(allNodes),
        nodes: allNodes
      };
      
      await this.cache.save(finalSnapshot);
      
    } catch (error) {
      console.error('Failed to scan directory:', error);
      // Yield empty array to prevent UI blocking
      yield [];
    } finally {
      this.metrics.scanTime = performance.now() - startTime;
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
    
    // Build snapshot from fresh scan
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
    return { ...this.metrics };
  }
  
  private async scanDirectoriesFirst(path: string, options: ScanOptions): Promise<FileNode[]> {
    try {
      const result = await invoke<{
        success: boolean;
        directories: Array<{
          path: string;
          name: string;
          depth: number;
          last_modified: number;
        }>;
      }>('scan_directories_only', { 
        path, 
        maxDepth: options.maxDepth || 3,
        ignorePatterns: options.ignorePatterns 
      });
      
      if (!result.success) return [];
      
      return result.directories.map(dir => ({
        id: this.generateId(dir.path),
        path: dir.path,
        name: dir.name,
        depth: dir.depth,
        isDirectory: true,
        isExpanded: dir.depth === 0, // Only root expanded initially
        lastModified: dir.last_modified,
        extension: '',
        iconId: this.getIconId('', true),
        hasChildren: true
      }));
    } catch (error) {
      console.warn('Failed to scan directories:', error);
      return [];
    }
  }
  
  private async* scanFilesChunked(path: string, options: ScanOptions): AsyncIterableIterator<FileNode[]> {
    try {
      // Use Tauri command for chunked file scanning
      let offset = 0;
      const chunkSize = options.chunkSize;
      
      while (true) {
        const result = await invoke<{
          success: boolean;
          files: Array<{
            path: string;
            name: string;
            depth: number;
            size: number;
            last_modified: number;
            extension: string;
          }>;
          hasMore: boolean;
        }>('scan_files_chunked', { 
          path, 
          offset, 
          limit: chunkSize,
          ignorePatterns: options.ignorePatterns,
          includeHidden: options.includeHidden
        });
        
        if (!result.success || result.files.length === 0) break;
        
        const nodes: FileNode[] = result.files.map(file => ({
          id: this.generateId(file.path),
          path: file.path,
          name: file.name,
          depth: file.depth,
          isDirectory: false,
          size: file.size,
          lastModified: file.last_modified,
          extension: file.extension,
          iconId: this.getIconId(file.extension, false)
        }));
        
        yield nodes;
        
        if (!result.hasMore) break;
        offset += chunkSize;
        
        // Small delay to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    } catch (error) {
      console.warn('Failed to scan files:', error);
    }
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
export const fileSystemService = new HighPerformanceFileSystemService(); 