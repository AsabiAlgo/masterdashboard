/**
 * API Client
 *
 * REST API client for communicating with the backend server.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4050/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

interface RequestOptions extends RequestInit {
  timeout?: number;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || 'Request failed',
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408);
    }

    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}

/**
 * API client with typed methods for each endpoint
 */
export const api = {
  // Sessions
  sessions: {
    list: () => request<unknown[]>('/sessions'),
    get: (id: string) => request<unknown>(`/sessions/${id}`),
    terminate: (id: string) =>
      request<void>(`/sessions/${id}`, { method: 'DELETE' }),
  },

  // Projects
  projects: {
    list: () => request<unknown[]>('/projects'),
    get: (id: string) => request<unknown>(`/projects/${id}`),
    create: (data: unknown) =>
      request<unknown>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: unknown) =>
      request<unknown>(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/projects/${id}`, { method: 'DELETE' }),
  },

  // Layouts
  layouts: {
    list: () => request<unknown[]>('/layouts'),
    get: (id: string) => request<unknown>(`/layouts/${id}`),
    save: (data: unknown) =>
      request<unknown>('/layouts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/layouts/${id}`, { method: 'DELETE' }),
  },

  // Health
  health: () => request<{ status: string }>('/health'),
};

export { ApiError };
export type { ApiResponse };
