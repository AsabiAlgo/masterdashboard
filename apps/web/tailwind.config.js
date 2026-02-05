/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Theme-aware colors using CSS variables
        theme: {
          'bg-primary': 'rgb(var(--bg-primary) / <alpha-value>)',
          'bg-secondary': 'rgb(var(--bg-secondary) / <alpha-value>)',
          'bg-tertiary': 'rgb(var(--bg-tertiary) / <alpha-value>)',
          'bg-canvas': 'rgb(var(--bg-canvas) / <alpha-value>)',
          'bg-node': 'rgb(var(--bg-node) / <alpha-value>)',
          'bg-node-header': 'rgb(var(--bg-node-header) / <alpha-value>)',
          'bg-input': 'rgb(var(--bg-input) / <alpha-value>)',
          'bg-hover': 'rgb(var(--bg-hover) / <alpha-value>)',
          'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
          'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
          'text-muted': 'rgb(var(--text-muted) / <alpha-value>)',
          'text-inverse': 'rgb(var(--text-inverse) / <alpha-value>)',
          'border-primary': 'rgb(var(--border-primary) / <alpha-value>)',
          'border-secondary': 'rgb(var(--border-secondary) / <alpha-value>)',
          'border-focus': 'rgb(var(--border-focus) / <alpha-value>)',
          'accent-primary': 'rgb(var(--accent-primary) / <alpha-value>)',
          'accent-success': 'rgb(var(--accent-success) / <alpha-value>)',
          'accent-warning': 'rgb(var(--accent-warning) / <alpha-value>)',
          'accent-error': 'rgb(var(--accent-error) / <alpha-value>)',
          'accent-info': 'rgb(var(--accent-info) / <alpha-value>)',
        },
        // Terminal color palette (Tokyo Night theme - default)
        terminal: {
          bg: 'rgb(var(--terminal-bg) / <alpha-value>)',
          text: 'rgb(var(--terminal-text) / <alpha-value>)',
          cursor: 'rgb(var(--terminal-cursor) / <alpha-value>)',
          selection: 'rgb(var(--terminal-selection) / <alpha-value>)',
        },
        // Node type colors (kept static for consistency)
        node: {
          terminal: '#22c55e', // Green
          browser: '#3b82f6', // Blue
          ssh: '#f59e0b', // Amber
          group: '#8b5cf6', // Purple
          notes: '#eab308', // Yellow
          folder: '#06b6d4', // Cyan
          viewer: '#ec4899', // Pink
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        node: 'var(--shadow-node)',
        'node-selected': '0 0 0 2px rgba(59, 130, 246, 0.5), var(--shadow-node)',
        'theme-sm': 'var(--shadow-sm)',
        'theme-md': 'var(--shadow-md)',
        'theme-lg': 'var(--shadow-lg)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
};
