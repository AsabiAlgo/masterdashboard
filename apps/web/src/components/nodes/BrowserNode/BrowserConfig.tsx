/**
 * Browser Config Modal Component
 *
 * Configuration modal for browser settings like engine and viewport.
 */

'use client';

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import {
  BrowserEngine,
  type BrowserNodeData,
  DEFAULT_BROWSER_VIEWPORT,
} from '@masterdashboard/shared';

interface BrowserConfigProps {
  /** Node ID (reserved for future use) */
  nodeId: string;
  /** Current node data */
  data: BrowserNodeData;
  /** Close handler */
  onClose: () => void;
  /** Save handler */
  onSave: (config: BrowserConfigData) => void;
}

export interface BrowserConfigData {
  engine: BrowserEngine;
  viewport: {
    width: number;
    height: number;
  };
}

const VIEWPORT_PRESETS = [
  { name: 'Desktop (1280x720)', width: 1280, height: 720 },
  { name: 'Desktop HD (1920x1080)', width: 1920, height: 1080 },
  { name: 'Tablet (768x1024)', width: 768, height: 1024 },
  { name: 'Mobile (375x667)', width: 375, height: 667 },
  { name: 'Custom', width: 0, height: 0 },
] as const;

const ENGINE_OPTIONS = [
  {
    value: BrowserEngine.CHROMIUM,
    label: 'Chromium',
    description: 'Best compatibility, CDP streaming support',
  },
  {
    value: BrowserEngine.FIREFOX,
    label: 'Firefox',
    description: 'Firefox engine (no CDP streaming)',
  },
  {
    value: BrowserEngine.WEBKIT,
    label: 'WebKit',
    description: 'Safari/WebKit engine (no CDP streaming)',
  },
] as const;

export const BrowserConfig = memo(function BrowserConfig({
  nodeId: _nodeId,
  data,
  onClose,
  onSave,
}: BrowserConfigProps) {
  void _nodeId; // Reserved for future use
  const modalRef = useRef<HTMLDivElement>(null);

  const [engine, setEngine] = useState<BrowserEngine>(
    data.engine || BrowserEngine.CHROMIUM
  );
  const [viewportPreset, setViewportPreset] = useState('Desktop (1280x720)');
  const [customWidth, setCustomWidth] = useState(DEFAULT_BROWSER_VIEWPORT.width);
  const [customHeight, setCustomHeight] = useState(DEFAULT_BROWSER_VIEWPORT.height);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Handle preset change
  const handlePresetChange = useCallback((presetName: string) => {
    setViewportPreset(presetName);
    const preset = VIEWPORT_PRESETS.find((p) => p.name === presetName);
    if (preset && preset.width > 0) {
      setCustomWidth(preset.width);
      setCustomHeight(preset.height);
    }
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    const viewport =
      viewportPreset === 'Custom'
        ? { width: customWidth, height: customHeight }
        : VIEWPORT_PRESETS.find((p) => p.name === viewportPreset) || DEFAULT_BROWSER_VIEWPORT;

    onSave({
      engine,
      viewport: {
        width: viewport.width,
        height: viewport.height,
      },
    });
  }, [engine, viewportPreset, customWidth, customHeight, onSave]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-700">
          <h3 className="text-white font-medium">Browser Settings</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-600 rounded transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Engine Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Browser Engine
            </label>
            <div className="space-y-2">
              {ENGINE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex items-start p-3 rounded-lg border cursor-pointer transition-colors
                    ${
                      engine === option.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="engine"
                    value={option.value}
                    checked={engine === option.value}
                    onChange={(e) => setEngine(e.target.value as BrowserEngine)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="text-white font-medium">{option.label}</div>
                    <div className="text-gray-400 text-sm">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Viewport Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Viewport Size
            </label>
            <select
              value={viewportPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {VIEWPORT_PRESETS.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Viewport */}
          {viewportPreset === 'Custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Width (px)
                </label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(parseInt(e.target.value) || 0)}
                  min={320}
                  max={3840}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Height (px)
                </label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(parseInt(e.target.value) || 0)}
                  min={240}
                  max={2160}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Warning for non-Chromium engines */}
          {engine !== BrowserEngine.CHROMIUM && (
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <WarningIcon />
              <div className="text-yellow-400 text-sm">
                CDP screencast streaming is only supported in Chromium. Other engines will use
                periodic screenshots instead, which may result in lower frame rates.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 bg-gray-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
});

function CloseIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}
