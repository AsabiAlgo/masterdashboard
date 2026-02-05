# Master Dashboard - Web Application

React Flow-based canvas application for terminal and browser orchestration.

## Overview

This is the frontend application for Master Dashboard, built with:

- **Next.js 14** - React framework with App Router
- **React Flow** - Canvas library for node-based interfaces
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Socket.IO Client** - Real-time communication

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page (canvas)
│   ├── globals.css        # Global styles
│   └── providers.tsx      # Context providers
├── components/
│   ├── canvas/            # Canvas components
│   │   ├── Canvas.tsx     # Main React Flow canvas
│   │   └── CanvasControls.tsx
│   ├── nodes/             # Node components
│   │   ├── BaseNode.tsx   # Shared node wrapper
│   │   ├── TerminalNode.tsx
│   │   ├── BrowserNode.tsx
│   │   └── SSHNode.tsx
│   ├── palette/           # Node creation sidebar
│   │   ├── NodePalette.tsx
│   │   └── PaletteItem.tsx
│   └── ui/                # Reusable UI components
│       ├── Button.tsx
│       ├── Panel.tsx
│       └── Tooltip.tsx
├── hooks/                 # Custom React hooks
│   ├── useWebSocket.ts    # WebSocket connection
│   ├── useCanvas.ts       # Canvas utilities
│   └── useSession.ts      # Session management
├── stores/                # Zustand stores
│   └── canvas-store.ts    # Canvas state
└── lib/                   # Utilities
    └── api.ts             # REST API client
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+

### Development

```bash
# From repository root
pnpm install

# Start development server
pnpm dev

# Or start just the web app
cd apps/web
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

## Features

### Canvas

- **Pan & Zoom**: Navigate the canvas with mouse/trackpad
- **Drag & Drop**: Create nodes by dragging from the palette
- **Node Selection**: Click nodes to select, Escape to deselect
- **Connections**: Draw edges between nodes
- **Minimap**: Overview of the canvas layout
- **Controls**: Fit view, arrange, export, clear

### Node Types

1. **Terminal Node** - Local shell sessions (bash, zsh, fish)
2. **Browser Node** - Playwright browser instances
3. **SSH Node** - Remote SSH connections

### State Persistence

Canvas layout is persisted to localStorage and survives page refresh.

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

## Building

```bash
# Production build
pnpm build

# Start production server
pnpm start
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Delete` / `Backspace` | Remove selected node |
| `Escape` | Deselect all |
| `Ctrl/Cmd + A` | Select all nodes |
| Scroll | Zoom in/out |
| Click + Drag | Pan canvas |

## Architecture Notes

### State Management

The app uses Zustand for state management with persistence middleware:

- **canvas-store**: Manages nodes, edges, viewport, and selection
- State is automatically persisted to localStorage

### WebSocket Communication

Real-time communication with the backend uses Socket.IO:

- Auto-reconnection with exponential backoff
- Event-based messaging for session management
- Status synchronization for nodes

### React Flow Integration

Custom node types are registered in `components/nodes/index.ts`:

```typescript
export const nodeTypes: NodeTypes = {
  [NodeType.TERMINAL]: TerminalNode,
  [NodeType.BROWSER]: BrowserNode,
  [NodeType.SSH]: SSHNode,
};
```

## Contributing

1. Node components should extend `BaseNode` for consistent styling
2. Use the shared types from `@masterdashboard/shared`
3. Follow the existing patterns for hooks and stores
4. Add tests for new features
