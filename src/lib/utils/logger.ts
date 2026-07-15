/**
 * Thin logging wrapper that no-ops in production so no debug/error output
 * ever leaks into production consoles or logs.
 */

const isProduction = process.env.NODE_ENV === 'production';

function info(...args: unknown[]): void {
  if (!isProduction) console.info('[INFO]', ...args);
}

function warn(...args: unknown[]): void {
  if (!isProduction) console.warn('[WARN]', ...args);
}

function error(...args: unknown[]): void {
  if (!isProduction) console.error('[ERROR]', ...args);
}

function debug(...args: unknown[]): void {
  if (!isProduction) console.debug('[DEBUG]', ...args);
}

export const logger = { info, warn, error, debug };
