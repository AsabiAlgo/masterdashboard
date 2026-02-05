# @asabialgo/create-masterdashboard

Scaffold a new [Master Dashboard](https://github.com/AsabiAlgo/masterdashboard) project with a single command.

## Usage

```bash
npx @asabialgo/create-masterdashboard my-dashboard
```

Or with pnpm:

```bash
pnpm create @asabialgo/masterdashboard my-dashboard
```

## What it does

1. Downloads the latest Master Dashboard template from GitHub
2. Removes internal/development-only files
3. Updates the project name in `package.json`
4. Installs dependencies with pnpm (if available)
5. Initializes a fresh git repository

## After scaffolding

```bash
cd my-dashboard
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

- Frontend: http://localhost:3050
- Backend: http://localhost:4000

## Requirements

- Node.js 18+
- pnpm 8+ (recommended)

## License

MIT
