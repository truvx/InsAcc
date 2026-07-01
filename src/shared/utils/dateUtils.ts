/**
 * Shared date utility functions.
 * Centralizes common timestamp helpers used across all services.
 */

/** Returns the current UTC timestamp as an ISO-8601 string. */
export function now(): string {
  return new Date().toISOString()
}
