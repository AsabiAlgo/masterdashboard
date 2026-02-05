/**
 * Terminal Node Exports
 *
 * Public API for the Terminal Node component.
 */

export { TerminalNode } from './TerminalNode';
export { Terminal, type TerminalHandle } from './Terminal';
export { TerminalToolbar } from './TerminalToolbar';
export { TerminalConfig, type TerminalConfigData } from './TerminalConfig';

// Hooks
export { useTerminalSocket } from './hooks/useTerminalSocket';
export { useTerminal, getShellDisplayName, getShellColor, AVAILABLE_SHELLS } from './hooks/useTerminal';

// Utils
export {
  terminalThemes,
  themeNames,
  getThemeDisplayName,
  type TerminalThemeName,
} from './utils/themes';
