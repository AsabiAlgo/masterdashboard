/**
 * Query Results Table
 *
 * Displays query results in a sortable, scrollable table.
 */

'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import type { QueryResult } from '@masterdashboard/shared';

interface ResultsTableProps {
  results: QueryResult | null;
  loading?: boolean;
  error?: string | null;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

export const ResultsTable = memo(function ResultsTable({
  results,
  loading = false,
  error,
}: ResultsTableProps) {
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  const handleSort = useCallback((column: string) => {
    setSortState((prev) => {
      if (prev.column === column) {
        // Cycle: asc -> desc -> none
        if (prev.direction === 'asc') return { column, direction: 'desc' };
        if (prev.direction === 'desc') return { column: null, direction: null };
      }
      return { column, direction: 'asc' };
    });
  }, []);

  const handleCopyCell = useCallback(async (value: unknown, cellId: string) => {
    try {
      const text = value === null ? 'NULL' : String(value);
      await navigator.clipboard.writeText(text);
      setCopiedCell(cellId);
      setTimeout(() => setCopiedCell(null), 1500);
    } catch {
      // Copy failed - silently ignore
    }
  }, []);

  const handleExportCSV = useCallback(() => {
    if (!results || results.rows.length === 0) return;

    const headers = results.columns.join(',');
    const rows = results.rows.map((row) =>
      results.columns.map((col) => {
        const val = row[col];
        if (val === null) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val);
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `query_results_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [results]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!results || !sortState.column || !sortState.direction) {
      return results?.rows ?? [];
    }

    return [...results.rows].sort((a, b) => {
      const aVal = a[sortState.column!];
      const bVal = b[sortState.column!];

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return sortState.direction === 'asc' ? 1 : -1;
      if (bVal === null) return sortState.direction === 'asc' ? -1 : 1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortState.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortState.direction === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [results, sortState]);

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <svg className="w-5 h-5 animate-spin mr-2" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Executing query...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 p-4">
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm font-mono whitespace-pre-wrap">
          {error}
        </div>
      </div>
    );
  }

  // Empty state
  if (!results) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          <p>Run a query to see results</p>
        </div>
      </div>
    );
  }

  // No rows
  if (results.rows.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700">
          <span className="text-xs text-slate-400">
            {results.affectedRows !== undefined
              ? `${results.affectedRows} row(s) affected`
              : 'Query executed successfully'}
          </span>
          <span className="text-xs text-slate-500">{results.executionTime}ms</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-500">
          <p>No rows returned</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Results Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700">
        <span className="text-xs text-slate-400">
          {results.rowCount} row{results.rowCount !== 1 ? 's' : ''}
          {results.truncated && (
            <span className="text-yellow-400 ml-1">
              (truncated, {results.totalRows} total)
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{results.executionTime}ms</span>
          <button
            onClick={handleExportCSV}
            className="px-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
            title="Export to CSV"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto nodrag nopan nowheel">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-800 z-10">
            <tr>
              {results.columns.map((column) => (
                <th
                  key={column}
                  onClick={() => handleSort(column)}
                  className="px-3 py-2 text-left text-xs font-medium text-slate-300 border-b border-slate-700 cursor-pointer hover:bg-slate-700 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>{column}</span>
                    {sortState.column === column && (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        {sortState.direction === 'asc' ? (
                          <path d="M7 14l5-5 5 5H7z" />
                        ) : (
                          <path d="M7 10l5 5 5-5H7z" />
                        )}
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-slate-800/50 border-b border-slate-800"
              >
                {results.columns.map((column, colIndex) => {
                  const value = row[column];
                  const cellId = `${rowIndex}-${colIndex}`;
                  const isNull = value === null;
                  const displayValue = isNull ? 'NULL' : String(value);

                  return (
                    <td
                      key={column}
                      onClick={() => handleCopyCell(value, cellId)}
                      className={`px-3 py-1.5 font-mono text-xs cursor-pointer hover:bg-slate-700/50 ${
                        isNull ? 'text-slate-500 italic' : 'text-slate-300'
                      } max-w-[300px] truncate`}
                      title={`${displayValue}\n\nClick to copy`}
                    >
                      {copiedCell === cellId ? (
                        <span className="text-green-400">Copied!</span>
                      ) : (
                        displayValue
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
