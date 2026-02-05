/**
 * Home Page - Project List
 *
 * Main page displaying all projects with ability to create new ones.
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { ProjectCard, CreateProjectDialog } from '@/components/projects';
import {
  useProjectStore,
  useProjects,
  useRecentProjectIds,
  useProjectLoading,
  useProjectError,
} from '@/stores/project-store';

export default function Home() {
  const { loadProjects, clearError } = useProjectStore();
  const projects = useProjects();
  const recentProjectIds = useRecentProjectIds();
  const isLoading = useProjectLoading();
  const error = useProjectError();

  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Get recent projects
  const recentProjects = useMemo(() => {
    return recentProjectIds
      .map((id) => projects.find((p) => p.id === id))
      .filter(Boolean);
  }, [recentProjectIds, projects]);

  // Filter out recent projects from all projects
  const otherProjects = useMemo(() => {
    const recentSet = new Set(recentProjectIds);
    return projects.filter((p) => !recentSet.has(p.id));
  }, [projects, recentProjectIds]);

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <svg
                  className="w-7 h-7 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
                <h1 className="text-xl font-semibold text-slate-100">
                  Master Dashboard
                </h1>
              </div>
              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                v0.1.0
              </span>
            </div>

            <Button onClick={() => setShowCreateDialog(true)}>
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Project
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Error message */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && projects.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400">Loading projects...</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-slate-200 mb-2">
              No projects yet
            </h2>
            <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
              Create your first project to start organizing terminals by workspace.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Project
            </Button>
          </div>
        )}

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Recent Projects
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProjects.map((project) =>
                project ? (
                  <ProjectCard
                    key={project.id}
                    id={project.id}
                    name={project.name}
                    defaultCwd={project.defaultCwd}
                    sessionCount={project.sessionCount}
                    updatedAt={project.updatedAt}
                  />
                ) : null
              )}
            </div>
          </section>
        )}

        {/* All Projects */}
        {otherProjects.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              {recentProjects.length > 0 ? 'Other Projects' : 'All Projects'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  defaultCwd={project.defaultCwd}
                  sessionCount={project.sessionCount}
                  updatedAt={project.updatedAt}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </main>
  );
}
