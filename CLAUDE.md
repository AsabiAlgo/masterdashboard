# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Master Dashboard is a persistent, web-based terminal orchestration platform. Terminals run on the server (like tmux) and survive browser disconnects, network blips, and reconnections. The browser is just a "viewer" that can reconnect and replay buffered output.

## Commands

```bash
# Install dependencies (pnpm 8+ required, Node 20+)
pnpm install

# Development (starts both frontend and backend via Turborepo)
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Lint
pnpm lint

# E2E tests (Playwright)
pnpm test:e2e
pnpm test:e2e:ui     # with UI
pnpm test:e2e:headed # visible browser

# Docker
pnpm docker:dev      # development containers
pnpm docker:up       # production containers

# Run single package commands
cd apps/web && pnpm dev      # frontend only (port 3050)
cd apps/server && pnpm dev   # backend only (port 4000)
cd packages/shared && pnpm build  # build shared types
```

## Architecture

```
masterdashboard/
├── apps/
│   ├── web/           # Next.js 14 frontend (React Flow canvas)
│   └── server/        # Fastify backend (PTY, SSH, WebSocket)
└── packages/
    └── shared/        # Shared TypeScript types and constants
```

### Frontend (`apps/web`)

- **Next.js 14** with App Router (`src/app/`)
- **React Flow** canvas for node-based UI (`src/components/canvas/`)
- **xterm.js** for terminal rendering (`src/components/nodes/TerminalNode/`)
- **Zustand** stores for state management (`src/stores/`)
- **Socket.IO Client** for real-time communication

Node types: `TerminalNode`, `BrowserNode`, `SSHNode` - all extend `BaseNode.tsx` for consistent styling.

### Backend (`apps/server`)

- **Fastify** HTTP server with Socket.IO
- **node-pty** for PTY management (`src/managers/pty-manager.ts`)
- **ssh2** for SSH connections (`src/managers/ssh-manager.ts`)
- **Playwright** for browser automation (`src/managers/browser-manager.ts`)
- **better-sqlite3** for persistence (`src/persistence/`)

Key manager pattern: `SessionManager` coordinates `PtyManager`, `BufferManager`, and `StatusDetector`.

### Shared (`packages/shared`)

Types and constants used by both frontend and backend:
- Session, Terminal, Project, Status, Buffer types
- WebSocket event constants
- Shell detection patterns (Claude Code, bash, SSH, git, editors)

Import via: `@masterdashboard/shared`, `@masterdashboard/shared/types`, `@masterdashboard/shared/constants`

## Key Patterns

### Session Persistence (tmux-style)

Sessions survive browser disconnect. On reconnect:
1. Server buffers output during disconnect
2. Client reconnects via Socket.IO
3. Server replays buffered output (20,000 lines scrollback)

### Status Detection

Pattern matching on terminal output determines status:
- Green (working): command executing
- Yellow (waiting): awaiting user input
- Red (error): command failed

Patterns defined in `apps/server/src/patterns/` for Claude Code, bash, SSH, git, editors.

### Project/Page Organization

Terminals organized into projects. Each project has its own canvas layout. Terminals don't auto-start on page load - user clicks "Quick Start" buttons to create new sessions.

## WebSocket Events

Events are defined in `packages/shared/src/constants/events.ts`. Key namespaces:
- `terminal:*` - PTY session events
- `ssh:*` - SSH session events
- `browser:*` - Browser automation events
- `session:*` - Session management

## Environment

Copy `.env.example` to `.env`:
- `PORT=4000` - Backend server port
- `CORS_ORIGIN=http://localhost:3000` - Frontend origin
- Frontend uses `.env.local` with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`

## Test Files

- Unit tests: `*.test.ts` files alongside source
- E2E tests: `e2e/` directory (Playwright)
- Test setup: `apps/web/src/test/setup.ts`
