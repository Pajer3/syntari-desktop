// Syntari AI IDE - Live File System Watcher Hook
// React hook for live file explorer updates

import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { fileSystemService } from '../services/fileSystemService';

// ================================
// TYPES
// ================================

interface FileSystemEvent {
  eventType: 'created' | 'modified' | 'deleted';
  path: string;
  oldPath?: string;
  timestamp: number;
  isDirectory: boolean;
}

interface UseFileSystemWatcherOptions {
  autoStart?: boolean;
  onFileCreated?: (path: string, isDirectory: boolean) => void;
  onFileModified?: (path: string, isDirectory: boolean) => void;
  onFileDeleted?: (path: string, isDirectory: boolean) => void;
  onFileRenamed?: (oldPath: string, newPath: string, isDirectory: boolean) => void;
  debounceMs?: number;
}

interface FileSystemWatcherState {
  isWatching: boolean;
  watchedPath: string | null;
  watcherId: string | null;
  lastEvent: FileSystemEvent | null;
  eventCount: number;
  error: string | null;
  events: FileSystemEvent[];
}



// ================================
// MAIN HOOK
// ================================

export const useFileSystemWatcher = (
  watchPath?: string,
  options: UseFileSystemWatcherOptions = {}
) => {
  const { autoStart = true, debounceMs = 200, ...callbacks } = options;
  
  const [state, setState] = useState<FileSystemWatcherState>({
    isWatching: false,
    watchedPath: null,
    watcherId: null,
    lastEvent: null,
    eventCount: 0,
    error: null,
    events: []
  });

  const unlistenRef = useRef<(() => void) | null>(null);
  const pendingEventsRef = useRef<FileSystemEvent[]>([]);
  const batchTimeoutRef = useRef<number>();

  // Refs for event handlers to avoid stale closures
  const handlersRef = useRef({
    onFileCreated: callbacks.onFileCreated,
    onFileModified: callbacks.onFileModified,
    onFileDeleted: callbacks.onFileDeleted,
    onFileRenamed: callbacks.onFileRenamed
  });

  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = {
      onFileCreated: callbacks.onFileCreated,
      onFileModified: callbacks.onFileModified,
      onFileDeleted: callbacks.onFileDeleted,
      onFileRenamed: callbacks.onFileRenamed
    };
  }, [callbacks.onFileCreated, callbacks.onFileModified, callbacks.onFileDeleted, callbacks.onFileRenamed]);

  // Event deduplication and batching
  const recentEventsRef = useRef<Map<string, number>>(new Map());

  // Cleanup recent events periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const staleThreshold = 5000; // 5 seconds
      
      recentEventsRef.current.forEach((timestamp, key) => {
        if (now - timestamp > staleThreshold) {
          recentEventsRef.current.delete(key);
        }
      });
    }, 10000); // Cleanup every 10 seconds

    return () => clearInterval(cleanup);
  }, []);

  // Event deduplication function
  const isDuplicateEvent = useCallback((event: FileSystemEvent): boolean => {
    const eventKey = `${event.eventType}:${event.path}:${event.isDirectory}`;
    const now = Date.now();
    const lastSeen = recentEventsRef.current.get(eventKey);
    
    // If we've seen this exact event in the last 1000ms, it's a duplicate
    if (lastSeen && (now - lastSeen) < 1000) {
      return true;
    }
    
    recentEventsRef.current.set(eventKey, now);
    return false;
  }, []);

  // Batch and process events
  const processBatchedEvents = useCallback(() => {
    if (pendingEventsRef.current.length === 0) return;

    const events = [...pendingEventsRef.current];
    pendingEventsRef.current = [];

    // Group events by type and path for more efficient processing
    const eventGroups = new Map<string, FileSystemEvent>();
    
    events.forEach(event => {
      const key = `${event.path}:${event.isDirectory}`;
      // Keep the latest event for each path
      eventGroups.set(key, event);
    });

    // Process unique events only
    eventGroups.forEach(event => {
      // Only log important events to reduce noise - just creation and deletion
      if (event.eventType === 'created' || event.eventType === 'deleted') {
        console.log(`📁 ${event.eventType}: ${event.path}${event.isDirectory ? ' (dir)' : ''}`);
      }

      setState(prevState => ({
        ...prevState,
        events: [...prevState.events.slice(-99), event] // Keep last 100 events
      }));

      // Notify file system service about the change for cache invalidation
      fileSystemService.handleFileSystemEvent(event.eventType, event.path, event.isDirectory);

      // Call appropriate handlers
      const handlers = handlersRef.current;
      switch (event.eventType) {
        case 'created':
          handlers.onFileCreated?.(event.path, event.isDirectory);
          break;
        case 'modified':
          handlers.onFileModified?.(event.path, event.isDirectory);
          break;
        case 'deleted':
          handlers.onFileDeleted?.(event.path, event.isDirectory);
          break;
      }

      // Handle rename events (when oldPath is present)
      if (event.oldPath && handlers.onFileRenamed) {
        // Also invalidate cache for the old path
        fileSystemService.handleFileSystemEvent('deleted', event.oldPath, event.isDirectory);
        handlers.onFileRenamed(event.oldPath, event.path, event.isDirectory);
      }
    });
  }, []);

  // Event listener with improved batching
  const eventListener = useCallback((event: { payload: FileSystemEvent }) => {
    try {
      const eventData = event.payload;
      
      // Skip duplicate events
      if (isDuplicateEvent(eventData)) {
        return;
      }

      // Add to pending events
      pendingEventsRef.current.push(eventData);

      // Clear existing timeout and set new one
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      // For file creation/deletion, process immediately for better UX
      if (eventData.eventType === 'created' || eventData.eventType === 'deleted') {
        batchTimeoutRef.current = window.setTimeout(processBatchedEvents, 50);
      } else {
        // For modifications, use longer debounce to reduce noise
        batchTimeoutRef.current = window.setTimeout(processBatchedEvents, debounceMs);
      }

    } catch (error) {
      console.error('❌ Error processing file system event:', error);
    }
  }, [isDuplicateEvent, processBatchedEvents, debounceMs]);

  // Start watching
  const startWatching = useCallback(async (path: string) => {
    try {
      // Stop existing watcher if any
      if (state.isWatching) {
        await stopWatching();
      }

      // Start backend watcher
      const watcherId = await invoke<string>('start_file_watcher', { path });
      
      // Set up event listener
      const unlisten = await listen<FileSystemEvent>('file-system-change', eventListener);
      unlistenRef.current = unlisten;

      setState(prev => ({
        ...prev,
        isWatching: true,
        watchedPath: path,
        watcherId: watcherId,
        error: null
      }));

    } catch (error) {
      console.error('❌ [FRONTEND] Failed to start file system watcher:', error);
      setState(prev => ({
        ...prev,
        isWatching: false,
        watchedPath: null,
        watcherId: null,
        error: error instanceof Error ? error.message : 'Failed to start watcher'
      }));
    }
  }, [eventListener]);

  // Stop watching
  const stopWatching = useCallback(async () => {
    try {
      if (state.watcherId) {
        await invoke('stop_file_watcher', { watcher_id: state.watcherId });
      }

      if (unlistenRef.current) {
        await unlistenRef.current();
        unlistenRef.current = null;
      }

      setState(prev => ({
        ...prev,
        isWatching: false,
        watchedPath: null,
        watcherId: null,
        error: null
      }));

    } catch (error) {
      console.error('❌ Failed to stop file system watcher:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to stop watcher'
      }));
    }
  }, [state.watcherId]);

  // Auto-start watcher when watchPath changes
  useEffect(() => {
    if (autoStart && watchPath) {
      if (!state.isWatching) {
        startWatching(watchPath);
      } else if (state.isWatching && state.watchedPath !== watchPath) {
        // Path changed, restart watcher
        stopWatching().then(() => startWatching(watchPath));
      }
    }
  }, [watchPath, autoStart, state.isWatching, state.watchedPath, startWatching, stopWatching]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startWatching,
    stopWatching,
    restartWatching: useCallback(async () => {
      if (state.watchedPath) {
        await stopWatching();
        await startWatching(state.watchedPath);
      }
    }, [state.watchedPath, stopWatching, startWatching])
  };
};

// ================================
// SPECIALIZED HOOK FOR FILE EXPLORER
// ================================

export const useFileExplorerWatcher = (
  rootPath?: string,
  onRefreshNeeded?: () => void
) => {
  const refreshTimeoutRef = useRef<number>();
  const lastRefreshRef = useRef<number>(0);

  // Debounced refresh function to prevent excessive updates
  const debouncedRefresh = useCallback(() => {
    const now = Date.now();
    
    // Reduce debounce time to 300ms for more responsive updates
    if (now - lastRefreshRef.current < 300) {
      // Clear existing timeout and set a new one
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      refreshTimeoutRef.current = window.setTimeout(() => {
        lastRefreshRef.current = Date.now();
        onRefreshNeeded?.();
      }, 300);
      return;
    }
    
    // Immediate refresh if enough time has passed
    lastRefreshRef.current = now;
    onRefreshNeeded?.();
  }, [onRefreshNeeded]);

  // Immediate refresh function for critical operations (no debounce)
  const immediateRefresh = useCallback(() => {
    lastRefreshRef.current = Date.now();
    onRefreshNeeded?.();
  }, [onRefreshNeeded]);

  const fileSystemWatcher = useFileSystemWatcher(rootPath, {
    autoStart: true,
    debounceMs: 100, // Reduced debounce for faster response
    
    onFileCreated: useCallback((path: string, isDirectory: boolean) => {
      // Always refresh for new files/directories - users expect immediate feedback
      immediateRefresh();
    }, [immediateRefresh]),
    
    onFileModified: useCallback((path: string, isDirectory: boolean) => {
      // Skip Syntari internal files to prevent refresh loops
      if (path.includes('.syntari_permission_test') || path.includes('.syntari')) {
        return;
      }
      
      // Refresh for any modification that could affect the file tree structure
      debouncedRefresh();
    }, [debouncedRefresh]),
    
    onFileDeleted: useCallback((path: string, isDirectory: boolean) => {
      // Always refresh immediately for deletions since they affect the visible tree
      immediateRefresh();
    }, [immediateRefresh]),
    
    onFileRenamed: useCallback((oldPath: string, newPath: string, isDirectory: boolean) => {
      immediateRefresh();
    }, [immediateRefresh])
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...fileSystemWatcher,
    debouncedRefresh,
    immediateRefresh
  };
};

// ================================
// UTILITY FUNCTIONS
// ================================

export const getFileSystemWatcherStats = async () => {
  try {
    const stats = await invoke<any>('get_file_watcher_stats');
    return stats;
  } catch (error) {
    console.error('Failed to get file watcher stats:', error);
    return null;
  }
}; 