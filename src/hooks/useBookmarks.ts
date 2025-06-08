// Syntari AI IDE - Bookmark Management Hook
// Simple bookmark system for code navigation

import { useState, useCallback, useRef } from 'react';

export interface Bookmark {
  id: string;
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  label?: string;
  timestamp: number;
}

export interface BookmarkManager {
  bookmarks: Bookmark[];
  toggleBookmark: (filePath: string, lineNumber: number, columnNumber?: number, label?: string) => void;
  removeBookmark: (id: string) => void;
  clearBookmarks: () => void;
  getBookmarksForFile: (filePath: string) => Bookmark[];
  nextBookmark: (currentFile: string, currentLine: number) => Bookmark | null;
  previousBookmark: (currentFile: string, currentLine: number) => Bookmark | null;
  hasBookmark: (filePath: string, lineNumber: number) => boolean;
}

export const useBookmarks = (): BookmarkManager => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const bookmarkIdCounter = useRef(0);

  const generateBookmarkId = useCallback(() => {
    return `bookmark_${++bookmarkIdCounter.current}_${Date.now()}`;
  }, []);

  const toggleBookmark = useCallback((
    filePath: string,
    lineNumber: number,
    columnNumber: number = 0,
    label?: string
  ) => {
    setBookmarks(prev => {
      // Check if bookmark already exists at this location
      const existingIndex = prev.findIndex(
        bookmark => bookmark.filePath === filePath && bookmark.lineNumber === lineNumber
      );

      if (existingIndex !== -1) {
        // Remove existing bookmark
        return prev.filter((_, index) => index !== existingIndex);
      } else {
        // Add new bookmark
        const newBookmark: Bookmark = {
          id: generateBookmarkId(),
          filePath,
          lineNumber,
          columnNumber,
          label,
          timestamp: Date.now()
        };
        return [...prev, newBookmark].sort((a, b) => {
          // Sort by file path first, then by line number
          if (a.filePath !== b.filePath) {
            return a.filePath.localeCompare(b.filePath);
          }
          return a.lineNumber - b.lineNumber;
        });
      }
    });
  }, [generateBookmarkId]);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));
  }, []);

  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
  }, []);

  const getBookmarksForFile = useCallback((filePath: string) => {
    return bookmarks.filter(bookmark => bookmark.filePath === filePath);
  }, [bookmarks]);

  const hasBookmark = useCallback((filePath: string, lineNumber: number) => {
    return bookmarks.some(
      bookmark => bookmark.filePath === filePath && bookmark.lineNumber === lineNumber
    );
  }, [bookmarks]);

  const nextBookmark = useCallback((currentFile: string, currentLine: number) => {
    const sorted = [...bookmarks].sort((a, b) => {
      if (a.filePath !== b.filePath) {
        return a.filePath.localeCompare(b.filePath);
      }
      return a.lineNumber - b.lineNumber;
    });

    // Find next bookmark in current file
    const nextInFile = sorted.find(
      bookmark => bookmark.filePath === currentFile && bookmark.lineNumber > currentLine
    );

    if (nextInFile) {
      return nextInFile;
    }

    // Find first bookmark in next file
    const nextFile = sorted.find(
      bookmark => bookmark.filePath > currentFile
    );

    if (nextFile) {
      return nextFile;
    }

    // Wrap around to first bookmark
    return sorted[0] || null;
  }, [bookmarks]);

  const previousBookmark = useCallback((currentFile: string, currentLine: number) => {
    const sorted = [...bookmarks].sort((a, b) => {
      if (a.filePath !== b.filePath) {
        return b.filePath.localeCompare(a.filePath);
      }
      return b.lineNumber - a.lineNumber;
    });

    // Find previous bookmark in current file
    const prevInFile = sorted.find(
      bookmark => bookmark.filePath === currentFile && bookmark.lineNumber < currentLine
    );

    if (prevInFile) {
      return prevInFile;
    }

    // Find last bookmark in previous file
    const prevFile = sorted.find(
      bookmark => bookmark.filePath < currentFile
    );

    if (prevFile) {
      return prevFile;
    }

    // Wrap around to last bookmark
    return sorted[0] || null;
  }, [bookmarks]);

  return {
    bookmarks,
    toggleBookmark,
    removeBookmark,
    clearBookmarks,
    getBookmarksForFile,
    nextBookmark,
    previousBookmark,
    hasBookmark
  };
}; 