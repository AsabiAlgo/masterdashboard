/**
 * Terminal Color Themes
 *
 * Color schemes for xterm.js terminal emulator.
 * Each theme provides a complete color palette for terminal rendering.
 */

import type { ITheme } from 'xterm';

export type TerminalThemeName =
  | 'dracula'
  | 'monokai'
  | 'nord'
  | 'solarizedDark'
  | 'oneDark'
  | 'gruvbox'
  | 'tokyoNight';

export const terminalThemes: Record<TerminalThemeName, ITheme> = {
  dracula: {
    foreground: '#f8f8f2',
    background: '#282a36',
    cursor: '#f8f8f2',
    cursorAccent: '#282a36',
    selectionBackground: '#44475a',
    selectionForeground: '#f8f8f2',
    selectionInactiveBackground: '#44475a80',
    black: '#6272a4', // Brightened from #21222c for visibility on dark background
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
    brightBlack: '#6272a4',
    brightRed: '#ff6e6e',
    brightGreen: '#69ff94',
    brightYellow: '#ffffa5',
    brightBlue: '#d6acff',
    brightMagenta: '#ff92df',
    brightCyan: '#a4ffff',
    brightWhite: '#ffffff',
  },
  monokai: {
    foreground: '#f8f8f2',
    background: '#272822',
    cursor: '#f8f8f2',
    cursorAccent: '#272822',
    selectionBackground: '#49483e',
    selectionForeground: '#f8f8f2',
    black: '#75715e', // Brightened from #272822 for visibility
    red: '#f92672',
    green: '#a6e22e',
    yellow: '#f4bf75',
    blue: '#66d9ef',
    magenta: '#ae81ff',
    cyan: '#a1efe4',
    white: '#f8f8f2',
    brightBlack: '#75715e',
    brightRed: '#f92672',
    brightGreen: '#a6e22e',
    brightYellow: '#f4bf75',
    brightBlue: '#66d9ef',
    brightMagenta: '#ae81ff',
    brightCyan: '#a1efe4',
    brightWhite: '#f9f8f5',
  },
  nord: {
    foreground: '#d8dee9',
    background: '#2e3440',
    cursor: '#d8dee9',
    cursorAccent: '#2e3440',
    selectionBackground: '#434c5e',
    selectionForeground: '#d8dee9',
    black: '#3b4252',
    red: '#bf616a',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    blue: '#81a1c1',
    magenta: '#b48ead',
    cyan: '#88c0d0',
    white: '#e5e9f0',
    brightBlack: '#4c566a',
    brightRed: '#bf616a',
    brightGreen: '#a3be8c',
    brightYellow: '#ebcb8b',
    brightBlue: '#81a1c1',
    brightMagenta: '#b48ead',
    brightCyan: '#8fbcbb',
    brightWhite: '#eceff4',
  },
  solarizedDark: {
    foreground: '#839496',
    background: '#002b36',
    cursor: '#839496',
    cursorAccent: '#002b36',
    selectionBackground: '#073642',
    selectionForeground: '#839496',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    brightBlack: '#002b36',
    brightRed: '#cb4b16',
    brightGreen: '#586e75',
    brightYellow: '#657b83',
    brightBlue: '#839496',
    brightMagenta: '#6c71c4',
    brightCyan: '#93a1a1',
    brightWhite: '#fdf6e3',
  },
  oneDark: {
    foreground: '#abb2bf',
    background: '#282c34',
    cursor: '#528bff',
    cursorAccent: '#282c34',
    selectionBackground: '#3e4451',
    selectionForeground: '#abb2bf',
    black: '#5c6370', // Brightened from #282c34 for visibility
    red: '#e06c75',
    green: '#98c379',
    yellow: '#e5c07b',
    blue: '#61afef',
    magenta: '#c678dd',
    cyan: '#56b6c2',
    white: '#abb2bf',
    brightBlack: '#5c6370',
    brightRed: '#e06c75',
    brightGreen: '#98c379',
    brightYellow: '#e5c07b',
    brightBlue: '#61afef',
    brightMagenta: '#c678dd',
    brightCyan: '#56b6c2',
    brightWhite: '#ffffff',
  },
  gruvbox: {
    foreground: '#ebdbb2',
    background: '#282828',
    cursor: '#ebdbb2',
    cursorAccent: '#282828',
    selectionBackground: '#504945',
    selectionForeground: '#ebdbb2',
    black: '#928374', // Brightened from #282828 for visibility
    red: '#cc241d',
    green: '#98971a',
    yellow: '#d79921',
    blue: '#458588',
    magenta: '#b16286',
    cyan: '#689d6a',
    white: '#a89984',
    brightBlack: '#928374',
    brightRed: '#fb4934',
    brightGreen: '#b8bb26',
    brightYellow: '#fabd2f',
    brightBlue: '#83a598',
    brightMagenta: '#d3869b',
    brightCyan: '#8ec07c',
    brightWhite: '#ebdbb2',
  },
  tokyoNight: {
    foreground: '#a9b1d6',
    background: '#1a1b26',
    cursor: '#c0caf5',
    cursorAccent: '#1a1b26',
    selectionBackground: '#33467c',
    selectionForeground: '#a9b1d6',
    black: '#444b6a', // Brightened from #32344a for visibility
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#ad8ee6',
    cyan: '#449dab',
    white: '#9699a8',
    brightBlack: '#444b6a',
    brightRed: '#ff7a93',
    brightGreen: '#b9f27c',
    brightYellow: '#ff9e64',
    brightBlue: '#7da6ff',
    brightMagenta: '#bb9af7',
    brightCyan: '#0db9d7',
    brightWhite: '#acb0d0',
  },
};

export const themeNames: TerminalThemeName[] = Object.keys(
  terminalThemes
) as TerminalThemeName[];

export function getThemeDisplayName(theme: TerminalThemeName): string {
  const displayNames: Record<TerminalThemeName, string> = {
    dracula: 'Dracula',
    monokai: 'Monokai',
    nord: 'Nord',
    solarizedDark: 'Solarized Dark',
    oneDark: 'One Dark',
    gruvbox: 'Gruvbox',
    tokyoNight: 'Tokyo Night',
  };
  return displayNames[theme];
}
