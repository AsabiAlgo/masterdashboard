/**
 * Breadcrumbs Component
 *
 * Clickable path navigation for folder viewer.
 */

'use client';

import { memo, useMemo } from 'react';

interface BreadcrumbsProps {
  path: string;
  rootPath: string;
  onNavigate: (path: string) => void;
}

const ChevronRight = () => (
  <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export const Breadcrumbs = memo(function Breadcrumbs({
  path,
  rootPath,
  onNavigate,
}: BreadcrumbsProps) {
  const segments = useMemo(() => {
    // Build path segments from root to current
    const result: { name: string; path: string }[] = [];

    // Start with root
    const normalizedRoot = rootPath.replace(/\/$/, '');
    const normalizedPath = path.replace(/\/$/, '');

    // Get the relative path from root
    let relativePath = normalizedPath;
    if (normalizedPath.startsWith(normalizedRoot)) {
      relativePath = normalizedPath.slice(normalizedRoot.length);
    }

    // Add root segment
    const rootName = normalizedRoot.split('/').pop() || '/';
    result.push({ name: rootName, path: normalizedRoot });

    // Add remaining segments
    if (relativePath && relativePath !== '/') {
      const parts = relativePath.split('/').filter(Boolean);
      let currentPath = normalizedRoot;

      for (const part of parts) {
        currentPath = `${currentPath}/${part}`;
        result.push({ name: part, path: currentPath });
      }
    }

    return result;
  }, [path, rootPath]);

  // Don't show if we're at root with only one segment
  if (segments.length <= 1) {
    return (
      <div className="flex items-center px-3 py-1.5 bg-slate-850 text-xs text-slate-400 border-b border-slate-700 min-h-[28px]">
        <span className="truncate">{segments[0]?.name || '/'}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center px-3 py-1.5 bg-slate-850 text-xs border-b border-slate-700 min-h-[28px] overflow-x-auto">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;

        return (
          <div key={segment.path} className="flex items-center flex-shrink-0">
            {index > 0 && (
              <span className="mx-1">
                <ChevronRight />
              </span>
            )}
            {isLast ? (
              <span className="text-slate-200 font-medium truncate max-w-[120px]" title={segment.name}>
                {segment.name}
              </span>
            ) : (
              <button
                className="text-slate-400 hover:text-slate-200 hover:underline truncate max-w-[100px] transition-colors"
                onClick={() => onNavigate(segment.path)}
                title={segment.path}
              >
                {segment.name}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
});
