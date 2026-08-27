const isDev = import.meta.env.DEV
export const log = (...args) => { if (isDev) console.log('[SOX]', ...args) }
export const logError = (...args) => { if (isDev) console.error('[SOX]', ...args) }
