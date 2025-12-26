import { create } from 'zustand';

/**
 * HAR Analyzer State Management Store
 * 
 * Organized state structure:
 * - rawHar: Original HAR data
 * - filteredHar: Processed/filtered entries
 * - uiState: UI-specific state (sidebar, modals, etc.)
 * - sanitizedHar: Sanitized version for export
 * - compareModeState: Comparison mode data
 */
export const useHarStore = create((set, get) => ({
  // Raw HAR Data
  rawHar: null,
  rawHar2: null, // For comparison mode

  // Filtered/Processed Data
  filteredHar: [],
  filteredHar2: [],

  // UI State
  uiState: {
    sidebarOpen: true,
    sidebarSearchQuery: '',
    viewMode: 'single', // 'single' | 'compare'
    showHelp: false,
    activeTab: null,
    developerMode: false,
    devLogs: [],
  },

  // Filter State
  filters: {
    method: 'all',
    status: 'all',
    contentType: 'all',
    domain: '',
    searchQuery: '',
    groupBy: 'none',
  },

  // Sort State
  sort: {
    by: 'startedDateTime',
    order: 'asc', // 'asc' | 'desc'
  },

  // Expanded State
  expanded: {
    groups: new Set(),
    entries: new Set(),
  },

  // Sanitization State
  sanitization: {
    enabled: false,
    fields: {
      cookies: true,
      headers: ['authorization', 'cookie', 'x-api-key', 'x-auth-token', 'x-auth-token', 'bearer'],
      body: false,
      urlParams: true,
      jsonFields: ['password', 'email', 'token', 'apiKey', 'secret', 'authorization'],
    },
    strictMode: false,
  },

  // Actions
  setRawHar: (har) => set({ rawHar: har }),
  setRawHar2: (har) => set({ rawHar2: har }),
  
  setFilteredHar: (entries) => set({ filteredHar: entries }),
  setFilteredHar2: (entries) => set({ filteredHar2: entries }),

  updateUIState: (updates) => set((state) => ({
    uiState: { ...state.uiState, ...updates }
  })),

  updateFilters: (updates) => set((state) => ({
    filters: { ...state.filters, ...updates }
  })),

  updateSort: (updates) => set((state) => ({
    sort: { ...state.sort, ...updates }
  })),

  toggleExpandedGroup: (key) => set((state) => {
    const newExpanded = new Set(state.expanded.groups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    return { expanded: { ...state.expanded, groups: newExpanded } };
  }),

  toggleExpandedEntry: (index) => set((state) => {
    const newExpanded = new Set(state.expanded.entries);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    return { expanded: { ...state.expanded, entries: newExpanded } };
  }),

  clearExpanded: () => set((state) => ({
    expanded: {
      groups: new Set(),
      entries: new Set(),
    }
  })),

  updateSanitization: (updates) => set((state) => ({
    sanitization: { ...state.sanitization, ...updates }
  })),

  // Developer Mode
  addDevLog: (log) => {
    const { uiState } = get();
    const newLogs = [...uiState.devLogs, { ...log, timestamp: new Date().toISOString() }];
    // Keep only last 100 logs
    if (newLogs.length > 100) {
      newLogs.shift();
    }
    set((state) => ({
      uiState: { ...state.uiState, devLogs: newLogs }
    }));
  },

  clearDevLogs: () => set((state) => ({
    uiState: { ...state.uiState, devLogs: [] }
  })),

  // Reset all state
  reset: () => set({
    rawHar: null,
    rawHar2: null,
    filteredHar: [],
    filteredHar2: [],
    uiState: {
      sidebarOpen: true,
      sidebarSearchQuery: '',
      viewMode: 'single',
      showHelp: false,
      activeTab: null,
      developerMode: false,
      devLogs: [],
    },
    filters: {
      method: 'all',
      status: 'all',
      contentType: 'all',
      domain: '',
      searchQuery: '',
      groupBy: 'none',
    },
    sort: {
      by: 'startedDateTime',
      order: 'asc',
    },
    expanded: {
      groups: new Set(),
      entries: new Set(),
    },
    sanitization: {
      enabled: false,
      fields: {
        cookies: true,
        headers: ['authorization', 'cookie', 'x-api-key', 'x-auth-token'],
        body: false,
        urlParams: true,
        jsonFields: ['password', 'email', 'token', 'apiKey', 'secret'],
      },
      strictMode: false,
    },
  }),
}));

