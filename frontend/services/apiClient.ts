export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export const API_BASE = `${API_BASE_URL}/api`;

/**
 * Wrapper for fetch with JSON content type.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
