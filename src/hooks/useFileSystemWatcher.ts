// Syntari AI IDE - Live File System Watcher Hook
// React hook for live file explorer updates

import { useEffect, useCallback, useRef, useState } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
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
  lastEvent: FileSystemEvent | null;
  eventCount: number;
  error: string | null;
  events: FileSystemEvent[];
}

// ================================
// DEBOUNCE UTILITY
// ================================

function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<number>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay]
  );
}

// ================================
// MAIN HOOK
// ================================

export const useFileSystemWatcher = (
  watchPath?: string,
  options: UseFileSystemWatcherOptions = {}
) => {
  const {
    autoStart = true,
    onFileCreated,
    onFileModified,
    onFileDeleted,
    onFileRenamed,
    debounceMs = 100
  } = options;

  // State
  const [state, setState] = useState<FileSystemWatcherState>({
    isWatching: false,
    watchedPath: null,
    lastEvent: null,
    eventCount: 0,
    error: null,
    events: []
  });

  // Refs for event handlers to avoid stale closures
  const handlersRef = useRef({
    onFileCreated,
    onFileModified,
    onFileDeleted,
    onFileRenamed
  });

  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = {
      onFileCreated,
      onFileModified,
      onFileDeleted,
      onFileRenamed
    };
  }, [onFileCreated, onFileModified, onFileDeleted, onFileRenamed]);

  // Event listener reference
  const unlistenRef = useRef<UnlistenFn | null>(null);

  // Event deduplication and batching
  const recentEventsRef = useRef<Map<string, number>>(new Map());
  const batchTimeoutRef = useRef<number>();
  const pendingEventsRef = useRef<FileSystemEvent[]>([]);

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
      // Reduced logging - only log important events
      if (event.eventType !== 'modified' || Math.random() < 0.1) { // Log only 10% of modify events
        console.log(`🔄 File system event: ${event.eventType} - ${event.path}${event.isDirectory ? ' (directory)' : ''}`);
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
        batchTimeoutRef.current = window.setTimeout(processBatchedEvents, 50); // 50ms for immediate operations
      } else {
        batchTimeoutRef.current = window.setTimeout(processBatchedEvents, 200); // 200ms for modifications
      }

    } catch (error) {
      console.error('🚨 Error processing file system event:', error);
    }
  }, [isDuplicateEvent, processBatchedEvents]);

  // Start watching a directory
  const startWatching = useCallback(async (path: string) => {
    try {
      console.log('🚀 Starting file system watcher for:', path);
      console.log('📍 Current state before starting:', state);

      // Stop any existing watcher
      if (unlistenRef.current) {
        console.log('🛑 Stopping existing watcher...');
        await unlistenRef.current();
        unlistenRef.current = null;
      }

      // Start backend watcher
      console.log('🔧 Invoking start_file_watcher command...');
      await invoke('start_file_watcher', { path });
      console.log('✅ Backend watcher started successfully');

      // Listen for file system events
      console.log('👂 Setting up event listener for file-system-change...');
      const unlisten = await listen<FileSystemEvent>('file-system-change', eventListener);

      unlistenRef.current = unlisten;

      setState(prev => ({
        ...prev,
        isWatching: true,
        watchedPath: path,
        error: null
      }));

      console.log('✅ File system watcher started successfully, listening for events');
    } catch (error) {
      console.error('❌ Failed to start file system watcher:', error);
      setState(prev => ({
        ...prev,
        isWatching: false,
        watchedPath: null,
        error: error instanceof Error ? error.message : 'Failed to start watcher'
      }));
    }
  }, [eventListener]);

  // Stop watching
  const stopWatching = useCallback(async () => {
    try {
      if (state.watchedPath) {
        console.log('🛑 Stopping file system watcher for:', state.watchedPath);
        await invoke('stop_file_watcher', { path: state.watchedPath });
      }

      if (unlistenRef.current) {
        await unlistenRef.current();
        unlistenRef.current = null;
      }

      setState(prev => ({
        ...prev,
        isWatching: false,
        watchedPath: null,
        error: null
      }));

      console.log('✅ File system watcher stopped successfully');
    } catch (error) {
      console.error('❌ Failed to stop file system watcher:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to stop watcher'
      }));
    }
  }, [state.watchedPath]);

  // Auto-start watcher when watchPath changes
  useEffect(() => {
    if (autoStart && watchPath) {
      if (!state.isWatching) {
        console.log('🚀 Auto-starting watcher for:', watchPath);
        startWatching(watchPath);
      } else if (state.isWatching && state.watchedPath !== watchPath) {
        console.log('🔄 Switching watcher from', state.watchedPath, 'to', watchPath);
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fileSystemWatcher = useFileSystemWatcher(rootPath, {
    autoStart: true,
    debounceMs: 200, // Slightly higher debounce for explorer refreshes
    
    onFileCreated: useCallback((path: string, isDirectory: boolean) => {
      console.log('📁 File created:', path, isDirectory ? '(directory)' : '(file)');
      setRefreshTrigger(prev => prev + 1);
      onRefreshNeeded?.();
    }, [onRefreshNeeded]),
    
    onFileModified: useCallback((path: string, isDirectory: boolean) => {
      console.log('✏️ File modified:', path, isDirectory ? '(directory)' : '(file)');
      setRefreshTrigger(prev => prev + 1);
      onRefreshNeeded?.();
    }, [onRefreshNeeded]),
    
    onFileDeleted: useCallback((path: string, isDirectory: boolean) => {
      console.log('🗑️ File deleted:', path, isDirectory ? '(directory)' : '(file)');
      setRefreshTrigger(prev => prev + 1);
      onRefreshNeeded?.();
    }, [onRefreshNeeded]),
    
    onFileRenamed: useCallback((oldPath: string, newPath: string, isDirectory: boolean) => {
      console.log('🔄 File renamed:', oldPath, '->', newPath, isDirectory ? '(directory)' : '(file)');
      setRefreshTrigger(prev => prev + 1);
      onRefreshNeeded?.();
    }, [onRefreshNeeded])
  });

  return {
    ...fileSystemWatcher,
    refreshTrigger, // Can be used as dependency in useMemo/useEffect
  };
};

// ================================
// UTILITY FUNCTIONS
// ================================

export const getFileSystemWatcherStats = async () => {
  try {
    return await invoke('get_file_watcher_stats');
  } catch (error) {
    console.error('Failed to get file watcher stats:', error);
    return [];
  }
}; 