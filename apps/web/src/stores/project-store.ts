/**
 * Project Store
 *
 * Zustand store for managing project/workspace state including
 * current project, project list, and recent projects.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Project,
  CreateProjectConfig,
  ProjectSettings,
} from '@masterdashboard/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ProjectWithCounts extends Omit<Project, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
  sessionCount: {
    total: number;
    active: number;
    paused: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
  };
}

interface ProjectState {
  // State
  currentProjectId: string | null;
  currentProject: ProjectWithCounts | null;
  projects: ProjectWithCounts[];
  recentProjectIds: string[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentProject: (projectId: string | null) => Promise<void>;
  loadProjects: () => Promise<void>;
  createProject: (config: CreateProjectConfig) => Promise<ProjectWithCounts | null>;
  updateProject: (
    projectId: string,
    updates: Partial<Pick<Project, 'name' | 'description' | 'defaultCwd'> & { settings: Partial<ProjectSettings> }>
  ) => Promise<ProjectWithCounts | null>;
  deleteProject: (projectId: string) => Promise<boolean>;
  killAllTerminals: (projectId: string) => Promise<boolean>;
  clearError: () => void;
}

function addToRecent(recentIds: string[], projectId: string): string[] {
  const filtered = recentIds.filter((id) => id !== projectId);
  return [projectId, ...filtered].slice(0, 5);
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentProjectId: null,
        currentProject: null,
        projects: [],
        recentProjectIds: [],
        isLoading: false,
        error: null,

        // Actions
        setCurrentProject: async (projectId) => {
          if (!projectId) {
            set({ currentProjectId: null, currentProject: null });
            return;
          }

          set({ isLoading: true, error: null });

          try {
            const response = await fetch(`${API_BASE}/api/projects/${projectId}`);
            const result: ApiResponse<ProjectWithCounts> = await response.json();

            if (!result.success || !result.data) {
              throw new Error(result.error || 'Failed to load project');
            }

            set({
              currentProjectId: projectId,
              currentProject: result.data,
              recentProjectIds: addToRecent(get().recentProjectIds, projectId),
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load project',
              isLoading: false,
            });
          }
        },

        loadProjects: async () => {
          set({ isLoading: true, error: null });

          try {
            const response = await fetch(`${API_BASE}/api/projects`);
            const result: ApiResponse<ProjectWithCounts[]> = await response.json();

            if (!result.success || !result.data) {
              throw new Error(result.error || 'Failed to load projects');
            }

            set({
              projects: result.data,
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load projects',
              isLoading: false,
            });
          }
        },

        createProject: async (config) => {
          set({ isLoading: true, error: null });

          try {
            const response = await fetch(`${API_BASE}/api/projects`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(config),
            });
            const result: ApiResponse<ProjectWithCounts> = await response.json();

            if (!result.success || !result.data) {
              throw new Error(result.error || 'Failed to create project');
            }

            const newProject = {
              ...result.data,
              sessionCount: { total: 0, active: 0, paused: 0 },
            };

            set({
              projects: [...get().projects, newProject],
              isLoading: false,
            });

            return newProject;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to create project',
              isLoading: false,
            });
            return null;
          }
        },

        updateProject: async (projectId, updates) => {
          set({ isLoading: true, error: null });

          try {
            const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
            });
            const result: ApiResponse<ProjectWithCounts> = await response.json();

            if (!result.success || !result.data) {
              throw new Error(result.error || 'Failed to update project');
            }

            const updatedProject = result.data;

            set({
              projects: get().projects.map((p) =>
                p.id === projectId ? updatedProject : p
              ),
              currentProject:
                get().currentProjectId === projectId
                  ? updatedProject
                  : get().currentProject,
              isLoading: false,
            });

            return updatedProject;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update project',
              isLoading: false,
            });
            return null;
          }
        },

        deleteProject: async (projectId) => {
          set({ isLoading: true, error: null });

          try {
            const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
              method: 'DELETE',
            });
            const result: ApiResponse<void> = await response.json();

            if (!result.success) {
              throw new Error(result.error || 'Failed to delete project');
            }

            const state = get();
            set({
              projects: state.projects.filter((p) => p.id !== projectId),
              recentProjectIds: state.recentProjectIds.filter((id) => id !== projectId),
              currentProjectId:
                state.currentProjectId === projectId ? null : state.currentProjectId,
              currentProject:
                state.currentProjectId === projectId ? null : state.currentProject,
              isLoading: false,
            });

            return true;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to delete project',
              isLoading: false,
            });
            return false;
          }
        },

        killAllTerminals: async (projectId) => {
          try {
            const response = await fetch(
              `${API_BASE}/api/projects/${projectId}/sessions`,
              { method: 'DELETE' }
            );
            const result: ApiResponse<void> = await response.json();

            if (!result.success) {
              throw new Error(result.error || 'Failed to kill terminals');
            }

            // Refresh the current project to update session counts
            if (get().currentProjectId === projectId) {
              await get().setCurrentProject(projectId);
            }
            await get().loadProjects();

            return true;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to kill terminals',
            });
            return false;
          }
        },

        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: 'masterdashboard-projects',
        partialize: (state) => ({
          currentProjectId: state.currentProjectId,
          recentProjectIds: state.recentProjectIds,
        }),
      }
    ),
    { name: 'ProjectStore' }
  )
);

// Selector hooks for optimized renders
export const useCurrentProject = () =>
  useProjectStore((state) => state.currentProject);
export const useProjects = () => useProjectStore((state) => state.projects);
export const useRecentProjectIds = () =>
  useProjectStore((state) => state.recentProjectIds);
export const useProjectLoading = () =>
  useProjectStore((state) => state.isLoading);
export const useProjectError = () => useProjectStore((state) => state.error);
