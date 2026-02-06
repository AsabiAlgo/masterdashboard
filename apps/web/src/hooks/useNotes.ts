/**
 * Notes Hook
 *
 * Custom hook for syncing notes with the backend.
 * Handles note creation, updates, and deletion via REST API.
 *
 * Note: Auto-loading is disabled to avoid race conditions.
 * Notes persist locally via canvas store (localStorage).
 * Backend is used for durable persistence.
 */

import { useCallback, useRef } from 'react';
import { useCanvasStore } from '@/stores/canvas-store';
import {
  type NotesNodeData,
  type NoteColor,
  type NoteMode,
} from '@masterdashboard/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4050';

interface NoteResponse {
  id: string;
  projectId: string;
  content: string;
  color: NoteColor;
  mode: NoteMode;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Track which nodes are currently being created to prevent duplicates
const creatingNodes = new Set<string>();

export function useNotes(projectId: string | null) {
  const { updateNodeData } = useCanvasStore();

  const pendingUpdates = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  /**
   * Create a note in the backend
   */
  const createNote = useCallback(
    async (
      nodeId: string,
      data: {
        content?: string;
        color?: NoteColor;
        mode?: NoteMode;
        positionX?: number;
        positionY?: number;
        width?: number;
        height?: number;
      }
    ) => {
      if (!projectId) return;

      // Prevent duplicate creation for the same node
      if (creatingNodes.has(nodeId)) return;
      creatingNodes.add(nodeId);

      try {
        const response = await fetch(`${API_BASE}/api/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            ...data,
          }),
        });

        const result: ApiResponse<NoteResponse> = await response.json();

        if (result.success && result.data) {
          // Store the backend note ID and updatedAt in the node
          updateNodeData<NotesNodeData>(nodeId, {
            sessionId: result.data.id,
            updatedAt: result.data.updatedAt,
          });
        }
      } catch (error) {
        console.error('Failed to create note:', error);
      } finally {
        creatingNodes.delete(nodeId);
      }
    },
    [projectId, updateNodeData]
  );

  /**
   * Update a note in the backend (debounced)
   */
  const updateNote = useCallback(
    (noteId: string, updates: Partial<NoteResponse>) => {
      if (!noteId) return;

      // Cancel any pending update for this note
      const pending = pendingUpdates.current.get(noteId);
      if (pending) {
        clearTimeout(pending);
      }

      // Debounce the update to avoid too many API calls
      const timeoutId = setTimeout(async () => {
        try {
          await fetch(`${API_BASE}/api/notes/${noteId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
        } catch (error) {
          console.error('Failed to update note:', error);
        }
        pendingUpdates.current.delete(noteId);
      }, 500);

      pendingUpdates.current.set(noteId, timeoutId);
    },
    []
  );

  /**
   * Delete a note from the backend
   */
  const deleteNote = useCallback(async (noteId: string) => {
    if (!noteId) return;

    try {
      await fetch(`${API_BASE}/api/notes/${noteId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  }, []);

  /**
   * Sync a note node with the backend (only updates existing notes)
   */
  const syncNote = useCallback(
    (noteId: string, data: NotesNodeData, position: { x: number; y: number }, dimensions: { width: number; height: number }) => {
      // Only sync if we have a backend note ID
      if (!noteId) return;

      updateNote(noteId, {
        content: data.content,
        color: data.color,
        mode: data.mode,
        positionX: position.x,
        positionY: position.y,
        width: dimensions.width,
        height: dimensions.height,
      });
    },
    [updateNote]
  );

  return {
    createNote,
    updateNote,
    deleteNote,
    syncNote,
  };
}
