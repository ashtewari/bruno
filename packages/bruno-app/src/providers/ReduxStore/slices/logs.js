import { createSlice } from '@reduxjs/toolkit';

const AD_HOC_HISTORY_STORAGE_KEY = 'bruno.adHocRequestHistory.v1';
const MAX_AD_HOC_HISTORY_ENTRIES = 1000;

const loadPersistedAdHocHistory = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(AD_HOC_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const initialState = {
  logs: [],
  debugErrors: [],
  isConsoleOpen: false,
  activeTab: 'console',
  filters: {
    info: true,
    warn: true,
    error: true,
    debug: true,
    log: true
  },
  networkFilters: {
    GET: true,
    POST: true,
    PUT: true,
    DELETE: true,
    PATCH: true,
    HEAD: true,
    OPTIONS: true
  },
  selectedRequest: null,
  selectedError: null,
  adHocRequestHistory: loadPersistedAdHocHistory(),
  maxLogs: 1000,
  maxDebugErrors: 500
};

export const logsSlice = createSlice({
  name: 'logs',
  initialState,
  reducers: {
    addLog: (state, action) => {
      const { type, args, timestamp } = action.payload;
      const newLog = {
        id: Date.now() + Math.random(),
        type: type || 'log',
        message: args ? args.join(' ') : '',
        args: args || [],
        timestamp: timestamp || new Date().toISOString()
      };

      state.logs.push(newLog);

      if (state.logs.length > state.maxLogs) {
        state.logs = state.logs.slice(-state.maxLogs);
      }
    },
    addDebugError: (state, action) => {
      const { message, stack, filename, lineno, colno, args, timestamp } = action.payload;
      const newError = {
        id: Date.now() + Math.random(),
        message: message || 'Unknown error',
        stack: stack,
        filename: filename,
        lineno: lineno,
        colno: colno,
        args: args || [],
        timestamp: timestamp || new Date().toISOString()
      };

      state.debugErrors.push(newError);

      if (state.debugErrors.length > state.maxDebugErrors) {
        state.debugErrors = state.debugErrors.slice(-state.maxDebugErrors);
      }
    },
    clearLogs: (state) => {
      state.logs = [];
    },
    clearDebugErrors: (state) => {
      state.debugErrors = [];
    },
    openConsole: (state) => {
      state.isConsoleOpen = true;
    },
    closeConsole: (state) => {
      state.isConsoleOpen = false;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
      if (action.payload !== 'network') {
        state.selectedRequest = null;
      }
      if (action.payload !== 'debug') {
        state.selectedError = null;
      }
    },
    updateFilter: (state, action) => {
      const { filterType, enabled } = action.payload;
      state.filters[filterType] = enabled;
    },
    toggleAllFilters: (state, action) => {
      const enabled = action.payload;
      Object.keys(state.filters).forEach((key) => {
        state.filters[key] = enabled;
      });
    },
    updateNetworkFilter: (state, action) => {
      const { method, enabled } = action.payload;
      state.networkFilters[method] = enabled;
    },
    toggleAllNetworkFilters: (state, action) => {
      const enabled = action.payload;
      Object.keys(state.networkFilters).forEach((key) => {
        state.networkFilters[key] = enabled;
      });
    },
    setSelectedRequest: (state, action) => {
      state.selectedRequest = action.payload;
    },
    clearSelectedRequest: (state) => {
      state.selectedRequest = null;
    },
    setSelectedError: (state, action) => {
      state.selectedError = action.payload;
    },
    clearSelectedError: (state) => {
      state.selectedError = null;
    },
    addAdHocHistoryEntry: (state, action) => {
      const entry = action.payload;
      if (!entry) {
        return;
      }

      const alreadyExists = state.adHocRequestHistory.some((e) => e.historyId === entry.historyId);
      if (alreadyExists) {
        return;
      }

      state.adHocRequestHistory.push(entry);
      if (state.adHocRequestHistory.length > MAX_AD_HOC_HISTORY_ENTRIES) {
        state.adHocRequestHistory = state.adHocRequestHistory.slice(-MAX_AD_HOC_HISTORY_ENTRIES);
      }
    },
    setAdHocHistoryEntries: (state, action) => {
      const entries = Array.isArray(action.payload) ? action.payload : [];
      state.adHocRequestHistory = entries.slice(-MAX_AD_HOC_HISTORY_ENTRIES);
    }
  }
});

export const {
  addLog,
  addDebugError,
  clearLogs,
  clearDebugErrors,
  openConsole,
  closeConsole,
  setActiveTab,
  updateFilter,
  toggleAllFilters,
  updateNetworkFilter,
  toggleAllNetworkFilters,
  setSelectedRequest,
  clearSelectedRequest,
  setSelectedError,
  clearSelectedError,
  addAdHocHistoryEntry,
  setAdHocHistoryEntries
} = logsSlice.actions;

export default logsSlice.reducer;
