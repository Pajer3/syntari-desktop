// Syntari AI IDE - Tab Layout Types
// Type definitions for the tab management system

export interface Tab {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: string;
  closeable?: boolean;
  modified?: boolean;
  pinned?: boolean;
  filePath?: string;
  lastAccessed?: number;
  metadata?: Record<string, any>;
  isDirty?: boolean;
  size?: number; // For memory/performance tracking
}

export interface TabGroup {
  id: string;
  name: string;
  tabs: Tab[];
  activeTabId: string;
  collapsed?: boolean;
}

export interface SplitView {
  id: string;
  orientation: 'horizontal' | 'vertical';
  tabs: Tab[];
  activeTabId: string;
  size?: number;
  minSize?: number;
  maxSize?: number;
}

export interface TabMetrics {
  totalTabs: number;
  pinnedTabs: number;
  modifiedTabs: number;
  memoryUsage: number;
  averageTabSize: number;
}

export interface TabLayoutProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onNewTab?: () => void;
  onTabReorder?: (fromIndex: number, toIndex: number) => void;
  onUnsavedChangesWarning?: (tabId: string) => Promise<boolean>;
  className?: string;
  enableKeyboardNavigation?: boolean;
  enableContextMenu?: boolean;
  enableVirtualScrolling?: boolean;
  maxVisibleTabs?: number;
  splitViews?: SplitView[];
  onSplitView?: (orientation: 'horizontal' | 'vertical') => void;
  onTabDoubleClick?: (tabId: string) => void;
  onTabMiddleClick?: (tabId: string) => void;
  showTabMetrics?: boolean;
  enableTabGroups?: boolean;
  persistState?: boolean;
  stateKey?: string;
}

export interface TabContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  tabId: string;
  onClose: () => void;
  onAction: (action: string, tabId: string) => void;
  isPinned?: boolean;
  hasUnsavedChanges?: boolean;
  filePath?: string;
  tabIndex?: number;
  totalTabs?: number;
}

export interface VirtualTabRendererProps {
  tabs: Tab[];
  activeTabId: string;
  maxVisibleTabs: number;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabContextMenu: (e: React.MouseEvent, tabId: string) => void;
  onTabDrag: (tabId: string) => void;
  draggedTab: string | null;
  dragOverIndex: number | null;
  onTabDragEnd: () => void;
  onTabDragLeave: () => void;
  onTabDragEnter: (e: React.DragEvent, index: number) => void;
  onTabDragOver: (e: React.DragEvent, index: number) => void;
  onTabDropComplete: (e: React.DragEvent, dropIndex: number) => void;
} 