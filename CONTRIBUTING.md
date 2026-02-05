# Contributing to Master Dashboard

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 8+

### Setup

```bash
git clone https://github.com/AsabiAlgo/masterdashboard.git
cd masterdashboard
pnpm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

Frontend: `http://localhost:3050` | Backend: `http://localhost:4000`

## Making Changes

1. **Fork** the repo and create a branch from `main`
2. Make your changes
3. Run checks before submitting:
   ```bash
   pnpm typecheck    # Type checking
   pnpm lint         # Linting
   pnpm test         # Unit tests
   pnpm build        # Build all packages
   ```
4. Open a Pull Request against `main`

## Code Style

- **TypeScript** throughout -- no `any` types
- **Immutability** -- create new objects, never mutate
- **Small files** -- 200-400 lines typical, 800 max
- **Small functions** -- under 50 lines
- **Error handling** -- always handle errors with try/catch
- **Prettier + ESLint** -- auto-formatted via git hooks

## Commit Messages

Use conventional commits:

```
feat: add SSH key authentication
fix: terminal resize on reconnect
refactor: extract buffer manager from session manager
docs: update README with Docker instructions
test: add PTY manager unit tests
chore: update dependencies
```

## Project Structure

```
apps/web/          # Next.js frontend
apps/server/       # Fastify backend
packages/shared/   # Shared types and constants
```

- **Frontend changes**: `apps/web/src/`
- **Backend changes**: `apps/server/src/`
- **Shared types**: `packages/shared/src/`

## Reporting Bugs

Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Node.js version and OS
- Browser (if frontend issue)

## Feature Requests

Open an issue describing:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
