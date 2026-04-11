/**
 * Backward-compatible barrel for frontend service modules.
 *
 * Prefer importing from domain files for readability:
 * - @/services/storyApi
 * - @/services/generationApi
 * - @/services/imageUtils
 * - @/services/apiClient
 */

export { API_BASE_URL } from '@/services/apiClient';
export * from '@/services/storyApi';
export * from '@/services/generationApi';
export * from '@/services/imageUtils';
