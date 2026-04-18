/**
 * Shared HTTP transport for frontend-to-backend requests.
 * This file owns fetch defaults, not endpoint-specific behavior.
 */
import { BACKEND_BASE_URL } from '@/utils/runtimeConfig';

export const API_BASE_URL = BACKEND_BASE_URL;
export const API_BASE = `${BACKEND_BASE_URL}/api`;

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const isFormData = options.body instanceof FormData;

  return fetch(url, {
    ...options,
    headers: {
      ...(isFormData ? {}: { 'Content-Type': 'application/json'}),
      ...options.headers,
    },
  });
}
