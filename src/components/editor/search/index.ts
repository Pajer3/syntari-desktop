// Syntari AI IDE - Search Components Exports
// Clean exports for all search functionality

export { SearchPanel } from './SearchPanel';
export { SearchInput } from './SearchInput';
export { SearchResults } from './SearchResults';
export { SearchResult } from './SearchResult';
export { useProjectSearch } from './useProjectSearch';

// Export types for external usage
export type {
  SearchMatch,
  SearchResult as SearchResultType,
  SearchOptions,
} from './useProjectSearch'; 