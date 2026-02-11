/**
 * Node Color Settings Component
 *
 * Settings for customizing node header and border colors
 * for Terminal, SSH, and Browser node types.
 */

'use client';

import {
  useSettingsStore,
  DEFAULT_NODE_COLORS,
  type NodeType,
} from '@/stores/settings-store';

const NODE_TYPES: { id: NodeType; label: string; icon: React.ReactNode }[] = [
  {
    id: 'terminal',
    label: 'Terminal',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'ssh',
    label: 'SSH',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
  },
  {
    id: 'browser',
    label: 'Browser',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
];

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label
        className="text-sm min-w-[50px]"
        style={{ color: 'rgb(var(--text-primary))' }}
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 p-0"
          style={{ backgroundColor: 'transparent' }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
              onChange(v);
            }
          }}
          className="w-24 px-2 py-1 rounded-lg border text-sm font-mono"
          style={{
            backgroundColor: 'rgb(var(--bg-input))',
            borderColor: 'rgb(var(--border-primary))',
            color: 'rgb(var(--text-primary))',
          }}
        />
      </div>
    </div>
  );
}

export function NodeColorSettings() {
  const { nodeColors, setNodeColor, showResizeHandles, setShowResizeHandles } = useSettingsStore();

  const handleResetColors = () => {
    for (const nodeType of Object.keys(DEFAULT_NODE_COLORS) as NodeType[]) {
      setNodeColor(nodeType, 'header', DEFAULT_NODE_COLORS[nodeType].header);
      setNodeColor(nodeType, 'border', DEFAULT_NODE_COLORS[nodeType].border);
    }
  };

  return (
    <div className="space-y-8">
      {/* Resize Handles Toggle */}
      <section className="settings-section">
        <h3
          className="text-sm font-medium mb-4"
          style={{ color: 'rgb(var(--text-secondary))' }}
        >
          Resize Handles
        </h3>
        <div className="flex items-center justify-between">
          <label
            className="text-sm"
            style={{ color: 'rgb(var(--text-primary))' }}
          >
            Show corner resize handles
          </label>
          <button
            onClick={() => setShowResizeHandles(!showResizeHandles)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{
              backgroundColor: showResizeHandles
                ? 'rgb(var(--accent-primary))'
                : 'rgb(var(--bg-tertiary))',
            }}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                showResizeHandles ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {NODE_TYPES.map((nodeType) => (
        <section key={nodeType.id} className="settings-section">
          <div className="flex items-center gap-2 mb-4">
            <span style={{ color: nodeColors[nodeType.id].header }}>
              {nodeType.icon}
            </span>
            <h3
              className="text-sm font-medium"
              style={{ color: 'rgb(var(--text-secondary))' }}
            >
              {nodeType.label}
            </h3>
          </div>

          <div className="space-y-3 ml-1">
            <ColorPicker
              label="Header"
              value={nodeColors[nodeType.id].header}
              onChange={(v) => setNodeColor(nodeType.id, 'header', v)}
            />
            <ColorPicker
              label="Border"
              value={nodeColors[nodeType.id].border}
              onChange={(v) => setNodeColor(nodeType.id, 'border', v)}
            />
          </div>

          {/* Preview */}
          <div className="mt-3 ml-1">
            <div
              className="rounded-lg overflow-hidden shadow-lg"
              style={{
                boxShadow: `0 0 0 1px ${nodeColors[nodeType.id].border}`,
                maxWidth: 260,
              }}
            >
              <div
                className="flex items-center gap-2 px-3 py-1.5"
                style={{ backgroundColor: nodeColors[nodeType.id].header }}
              >
                <span className="text-white/80">{nodeType.icon}</span>
                <span className="text-white text-xs font-medium">
                  {nodeType.label} Preview
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 ml-1" />
              </div>
              <div
                className="px-3 py-2 text-xs font-mono"
                style={{
                  backgroundColor: 'rgb(var(--bg-tertiary))',
                  color: 'rgb(var(--text-secondary))',
                }}
              >
                ~ $ echo &quot;hello&quot;
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Reset */}
      <section className="settings-section">
        <button
          onClick={handleResetColors}
          className="px-3 py-1.5 text-sm rounded-lg border transition-colors hover:bg-theme-hover"
          style={{
            borderColor: 'rgb(var(--border-primary))',
            color: 'rgb(var(--text-secondary))',
          }}
        >
          Reset to Default Colors
        </button>
      </section>
    </div>
  );
}
