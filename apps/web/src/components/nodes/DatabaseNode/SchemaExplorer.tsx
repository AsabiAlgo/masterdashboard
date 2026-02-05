/**
 * Schema Explorer
 *
 * Tree view of database tables and columns.
 */

'use client';

import { memo, useState, useCallback } from 'react';
import type { DatabaseSchema, DatabaseTable, DatabaseColumn } from '@masterdashboard/shared';

interface SchemaExplorerProps {
  schema: DatabaseSchema | null;
  loading?: boolean;
  onRefresh: () => void;
  onTableClick?: (tableName: string) => void;
  onColumnClick?: (tableName: string, columnName: string) => void;
}

export const SchemaExplorer = memo(function SchemaExplorer({
  schema,
  loading = false,
  onRefresh,
  onTableClick,
  onColumnClick,
}: SchemaExplorerProps) {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [selectedSchema, setSelectedSchema] = useState<string | undefined>(undefined);

  const toggleTable = useCallback((tableName: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  }, []);

  const handleTableClick = useCallback(
    (e: React.MouseEvent, tableName: string) => {
      if (e.detail === 2) {
        // Double click - insert table name
        onTableClick?.(tableName);
      } else {
        // Single click - toggle expand
        toggleTable(tableName);
      }
    },
    [toggleTable, onTableClick]
  );

  const handleColumnClick = useCallback(
    (tableName: string, columnName: string) => {
      onColumnClick?.(tableName, columnName);
    },
    [onColumnClick]
  );

  // Get tables, optionally filtered by schema
  const tables = schema?.tables ?? [];
  const filteredTables = selectedSchema
    ? tables.filter((t) => t.schema === selectedSchema)
    : tables;

  return (
    <div className="flex flex-col h-full border-r border-slate-700 bg-slate-900/50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-xs font-medium text-slate-300">Schema</span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
          title="Refresh schema"
        >
          <svg
            className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Schema Selector (if multiple schemas) */}
      {schema?.schemas && schema.schemas.length > 1 && (
        <div className="px-3 py-2 border-b border-slate-700">
          <select
            value={selectedSchema ?? ''}
            onChange={(e) => setSelectedSchema(e.target.value || undefined)}
            className="w-full px-2 py-1 bg-slate-800 text-white text-xs rounded border border-slate-600 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">All Schemas</option>
            {schema.schemas.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Table List */}
      <div className="flex-1 overflow-auto nodrag nopan nowheel">
        {loading && !schema ? (
          <div className="flex items-center justify-center h-24 text-slate-500">
            <svg className="w-4 h-4 animate-spin mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="p-3 text-xs text-slate-500 text-center">No tables found</div>
        ) : (
          <div className="py-1">
            {filteredTables.map((table) => (
              <TableItem
                key={`${table.schema ?? 'default'}.${table.name}`}
                table={table}
                expanded={expandedTables.has(table.name)}
                onClick={handleTableClick}
                onColumnClick={handleColumnClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      {schema && (
        <div className="px-3 py-2 border-t border-slate-700 text-xs text-slate-500">
          {filteredTables.length} table{filteredTables.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
});

interface TableItemProps {
  table: DatabaseTable;
  expanded: boolean;
  onClick: (e: React.MouseEvent, tableName: string) => void;
  onColumnClick: (tableName: string, columnName: string) => void;
}

const TableItem = memo(function TableItem({
  table,
  expanded,
  onClick,
  onColumnClick,
}: TableItemProps) {
  const isView = table.type === 'view';

  return (
    <div>
      {/* Table Header */}
      <button
        onClick={(e) => onClick(e, table.name)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-800 text-left"
      >
        {/* Expand Icon */}
        <svg
          className={`w-3 h-3 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 5l8 7-8 7V5z" />
        </svg>

        {/* Table/View Icon */}
        {isView ? (
          <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}

        {/* Table Name */}
        <span className="text-xs text-slate-300 truncate flex-1">{table.name}</span>

        {/* Row Count (if available) */}
        {table.rowCount !== undefined && (
          <span className="text-xs text-slate-500">{table.rowCount}</span>
        )}
      </button>

      {/* Columns (expanded) */}
      {expanded && table.columns.length > 0 && (
        <div className="pl-6 py-1 bg-slate-900/50">
          {table.columns.map((column) => (
            <ColumnItem
              key={column.name}
              column={column}
              tableName={table.name}
              onClick={onColumnClick}
            />
          ))}
        </div>
      )}
    </div>
  );
});

interface ColumnItemProps {
  column: DatabaseColumn;
  tableName: string;
  onClick: (tableName: string, columnName: string) => void;
}

const ColumnItem = memo(function ColumnItem({
  column,
  tableName,
  onClick,
}: ColumnItemProps) {
  return (
    <button
      onClick={() => onClick(tableName, column.name)}
      className="w-full flex items-center gap-1.5 px-3 py-1 hover:bg-slate-800 text-left"
      title={`${column.type}${column.nullable ? ' (nullable)' : ''}${column.defaultValue ? ` DEFAULT ${column.defaultValue}` : ''}`}
    >
      {/* Column Icon */}
      {column.primaryKey ? (
        <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
        </svg>
      ) : column.foreignKey ? (
        <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ) : (
        <div className="w-3 h-3" />
      )}

      {/* Column Name */}
      <span className="text-xs text-slate-400 truncate flex-1">{column.name}</span>

      {/* Column Type */}
      <span className="text-xs text-slate-600 font-mono">{column.type}</span>

      {/* Nullable Indicator */}
      {!column.nullable && (
        <span className="text-xs text-orange-400" title="NOT NULL">*</span>
      )}
    </button>
  );
});
