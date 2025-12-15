/**
 * Debug logger utility
 * Only logs in development mode
 */
export const debugLog = (...args) => {
    if (process.env.NODE_ENV === 'development' || import.meta.env.DEV) {
        console.log('[DEBUG]', ...args);
    }
};

export const debugError = (...args) => {
    if (process.env.NODE_ENV === 'development' || import.meta.env.DEV) {
        console.error('[DEBUG ERROR]', ...args);
    }
};

export const debugWarn = (...args) => {
    if (process.env.NODE_ENV === 'development' || import.meta.env.DEV) {
        console.warn('[DEBUG WARN]', ...args);
    }
};

