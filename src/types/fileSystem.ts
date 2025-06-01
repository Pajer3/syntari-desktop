// Syntari AI IDE - High-Performance File System Types
// Flat list structure for virtualized rendering

export interface FileNode {
  readonly id: string;           // inode or path hash for stable keys
  readonly path: string;
  readonly name: string;
  readonly depth: number;        // For indentation in flat list
  readonly isDirectory: boolean;
  readonly isExpanded?: boolean; // Only for directories
  readonly size?: number;
  readonly lastModified: number;
  readonly extension: string;
  readonly iconId: string;       // Pre-computed icon identifier
  readonly hasChildren?: boolean; // For lazy loading
}

export interface FileSystemDiff {
  readonly added: readonly FileNode[];
  readonly removed: readonly string[]; // paths
  readonly modified: readonly FileNode[];
  readonly moved: readonly { from: string; to: string }[];
}

export interface FileSystemSnapshot {
  readonly version: number;
  readonly timestamp: number;
  readonly rootPath: string;
  readonly checksum: string;     // For cache validation
  readonly nodes: readonly FileNode[];
}

export interface FileWatchEvent {
  readonly type: 'created' | 'modified' | 'deleted' | 'renamed';
  readonly path: string;
  readonly oldPath?: string; // For rename events
  readonly timestamp: number;
}

export interface FileSystemCache {
  readonly save: (snapshot: FileSystemSnapshot) => Promise<void>;
  readonly load: (rootPath: string) => Promise<FileSystemSnapshot | null>;
  readonly isValid: (snapshot: FileSystemSnapshot, rootPath: string) => Promise<boolean>;
  readonly clear: () => Promise<void>;
}

export interface FileSystemService {
  readonly scanDirectory: (path: string, options?: ScanOptions) => AsyncIterableIterator<FileNode[]>;
  readonly watchDirectory: (path: string) => AsyncIterableIterator<FileWatchEvent>;
  readonly getSnapshot: (path: string) => Promise<FileSystemSnapshot>;
  readonly applyDiff: (current: readonly FileNode[], diff: FileSystemDiff) => readonly FileNode[];
}

export interface ScanOptions {
  readonly chunkSize: number;
  readonly maxDepth?: number;
  readonly ignorePatterns: readonly string[];
  readonly includeHidden: boolean;
}

// Performance metrics for monitoring
export interface FileSystemMetrics {
  readonly scanTime: number;
  readonly nodeCount: number;
  readonly cacheHitRate: number;
  readonly memoryUsage: number;
} 