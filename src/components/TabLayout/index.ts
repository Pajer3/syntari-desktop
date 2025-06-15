// Syntari AI IDE - Tab Layout Module
// Clean exports for the modular tab management system

// Main component and hook
export { TabLayout } from './TabLayout';
export { useTabManager } from './useTabManager';

// Sub-components (for advanced usage)
export { TabContextMenu } from './TabContextMenu';
export { VirtualTabRenderer } from './VirtualTabRenderer';

// Types
export type {
  Tab,
  TabGroup,
  SplitView,
  TabMetrics,
  TabLayoutProps,
  TabContextMenuProps,
  VirtualTabRendererProps,
} from './types'; 