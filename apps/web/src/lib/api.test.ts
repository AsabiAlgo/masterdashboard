/**
 * Unit tests for API client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, ApiError } from './api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('request function', () => {
    it('should make GET request successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [{ id: 1 }] }),
      });

      const result = await api.projects.list();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1 }]);
    });

    it('should make POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'new-project' } }),
      });

      const result = await api.projects.create({ name: 'Test Project' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test Project' }),
        })
      );
      expect(result.success).toBe(true);
    });

    it('should make PATCH request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'proj_123', name: 'Updated' } }),
      });

      await api.projects.update('proj_123', { name: 'Updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/proj_123'),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await api.projects.delete('proj_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/proj_123'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should throw ApiError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Project not found' }),
      });

      try {
        await api.projects.get('nonexistent');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(404);
        expect((error as ApiError).message).toBe('Project not found');
      }
    });

    it('should throw ApiError with default message if no error in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      try {
        await api.health();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Request failed');
        expect((error as ApiError).status).toBe(500);
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.health()).rejects.toThrow(ApiError);

      try {
        await api.health();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Network error');
        expect((error as ApiError).status).toBe(500);
      }
    });

    it('should handle unknown error types', async () => {
      mockFetch.mockRejectedValueOnce('string error');

      try {
        await api.health();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Unknown error');
        expect((error as ApiError).status).toBe(500);
      }
    });
  });

  describe('timeout handling', () => {
    it('should timeout after default 30s', async () => {
      mockFetch.mockImplementationOnce(() =>
        new Promise((resolve) => setTimeout(resolve, 35000))
      );

      const promise = api.health();

      // Advance time past timeout
      vi.advanceTimersByTime(31000);

      await expect(promise).rejects.toThrow(ApiError);

      try {
        await promise;
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Request timeout');
        expect((error as ApiError).status).toBe(408);
      }
    });
  });

  describe('sessions endpoints', () => {
    it('should list sessions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [{ id: 'sess_1' }, { id: 'sess_2' }],
        }),
      });

      const result = await api.sessions.list();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sessions'),
        expect.any(Object)
      );
      expect(result.data).toHaveLength(2);
    });

    it('should get session by id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'sess_123' } }),
      });

      const result = await api.sessions.get('sess_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sessions/sess_123'),
        expect.any(Object)
      );
      expect(result.data).toEqual({ id: 'sess_123' });
    });

    it('should terminate session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await api.sessions.terminate('sess_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sessions/sess_123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('projects endpoints', () => {
    it('should list projects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [{ id: 'proj_1' }, { id: 'proj_2' }],
        }),
      });

      const result = await api.projects.list();

      expect(result.data).toHaveLength(2);
    });

    it('should get project by id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'proj_123' } }),
      });

      const result = await api.projects.get('proj_123');

      expect(result.data).toEqual({ id: 'proj_123' });
    });

    it('should create project', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'proj_new', name: 'New Project' },
        }),
      });

      const result = await api.projects.create({ name: 'New Project' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New Project' }),
        })
      );
      expect(result.data).toEqual({ id: 'proj_new', name: 'New Project' });
    });

    it('should update project', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'proj_123', name: 'Updated Name' },
        }),
      });

      const result = await api.projects.update('proj_123', { name: 'Updated Name' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/proj_123'),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
      expect(result.data).toEqual({ id: 'proj_123', name: 'Updated Name' });
    });

    it('should delete project', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await api.projects.delete('proj_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/proj_123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('layouts endpoints', () => {
    it('should list layouts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [{ id: 'layout_1' }],
        }),
      });

      const result = await api.layouts.list();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/layouts'),
        expect.any(Object)
      );
      expect(result.data).toHaveLength(1);
    });

    it('should get layout by id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'layout_123' } }),
      });

      const result = await api.layouts.get('layout_123');

      expect(result.data).toEqual({ id: 'layout_123' });
    });

    it('should save layout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'layout_new' },
        }),
      });

      const result = await api.layouts.save({ nodes: [], edges: [] });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/layouts'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.data).toEqual({ id: 'layout_new' });
    });

    it('should delete layout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await api.layouts.delete('layout_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/layouts/layout_123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('health endpoint', () => {
    it('should check health', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { status: 'healthy' } }),
      });

      const result = await api.health();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/health'),
        expect.any(Object)
      );
      expect(result.data).toEqual({ status: 'healthy' });
    });
  });
});

describe('ApiError', () => {
  it('should create with all properties', () => {
    const error = new ApiError('Test error', 404, { details: 'info' });

    expect(error.message).toBe('Test error');
    expect(error.status).toBe(404);
    expect(error.data).toEqual({ details: 'info' });
    expect(error.name).toBe('ApiError');
  });

  it('should create without data', () => {
    const error = new ApiError('Simple error', 500);

    expect(error.message).toBe('Simple error');
    expect(error.status).toBe(500);
    expect(error.data).toBeUndefined();
  });

  it('should be instanceof Error', () => {
    const error = new ApiError('Test', 500);
    expect(error).toBeInstanceOf(Error);
  });
});
