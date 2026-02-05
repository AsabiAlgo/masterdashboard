/**
 * Monaco Theme Tests
 *
 * Tests for the Master Dashboard Monaco editor theme.
 */

import { describe, it, expect } from 'vitest';
import { masterDashboardTheme, THEME_NAME } from './monaco-theme';

describe('masterDashboardTheme', () => {
  it('should be based on vs-dark', () => {
    expect(masterDashboardTheme.base).toBe('vs-dark');
  });

  it('should have slate-900 background (#0f172a)', () => {
    expect(masterDashboardTheme.colors['editor.background']).toBe('#0f172a');
  });

  it('should have slate-200 foreground (#e2e8f0)', () => {
    expect(masterDashboardTheme.colors['editor.foreground']).toBe('#e2e8f0');
  });

  it('should inherit base theme rules', () => {
    expect(masterDashboardTheme.inherit).toBe(true);
  });

  it('should have cursor color', () => {
    expect(masterDashboardTheme.colors['editorCursor.foreground']).toBeDefined();
  });

  it('should have selection background', () => {
    expect(masterDashboardTheme.colors['editor.selectionBackground']).toBeDefined();
  });

  it('should have line number color (#64748b slate-500)', () => {
    expect(masterDashboardTheme.colors['editorLineNumber.foreground']).toBe('#64748b');
  });

  it('should have active line number color', () => {
    expect(masterDashboardTheme.colors['editorLineNumber.activeForeground']).toBeDefined();
  });

  it('should have gutter background matching editor', () => {
    expect(masterDashboardTheme.colors['editorGutter.background']).toBe('#0f172a');
  });

  it('should have line highlight background', () => {
    expect(masterDashboardTheme.colors['editor.lineHighlightBackground']).toBeDefined();
  });

  it('should have widget background for find dialog', () => {
    expect(masterDashboardTheme.colors['editorWidget.background']).toBeDefined();
  });

  it('should have minimap background', () => {
    expect(masterDashboardTheme.colors['minimap.background']).toBeDefined();
  });
});

describe('THEME_NAME', () => {
  it('should be master-dashboard', () => {
    expect(THEME_NAME).toBe('master-dashboard');
  });
});
