/**
 * Backward-compatible barrel for frontend service modules.
 *
 * Prefer importing from domain files for readability:
 * - ./storyApi
 * - ./generationApi
 * - ./imageUtils
 * - ./apiClient
 */

export { API_BASE_URL } from './apiClient';
export * from './storyApi';
export * from './generationApi';
export * from './imageUtils';
