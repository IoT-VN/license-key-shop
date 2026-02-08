/**
 * Application-wide constants
 */

export const APP_NAME = 'License Key Shop API';
export const API_VERSION = 'v1';
export const API_PREFIX = 'api';

// Rate limiting defaults
export const DEFAULT_RATE_LIMIT_TTL = 3600; // 1 hour in seconds
export const DEFAULT_RATE_LIMIT_MAX = 10000; // 10k requests per hour

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
};

// License key format
export const LICENSE_KEY_FORMAT = 'XXXX-XXXX-XXXX-XXXX';
export const LICENSE_KEY_LENGTH = 16; // 4 segments of 4 chars
