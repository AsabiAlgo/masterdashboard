#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Master Dashboard...${NC}"
echo ""

# Check requirements
echo -e "${YELLOW}Checking requirements...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is required but not installed.${NC}"
    echo "   Install Node.js 20+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js 20+ is required (found v${NODE_VERSION})${NC}"
    echo "   Upgrade Node.js from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js v$(node -v | cut -d'v' -f2)${NC}"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}Installing pnpm...${NC}"
    npm install -g pnpm@8
fi
echo -e "${GREEN}✓ pnpm $(pnpm -v)${NC}"

# Check Docker (optional)
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker $(docker --version | cut -d' ' -f3 | tr -d ',')${NC}"
else
    echo -e "${YELLOW}⚠ Docker not found (optional for development)${NC}"
fi

echo ""

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
pnpm install

echo ""

# Create .env files from examples
echo -e "${BLUE}📄 Setting up environment files...${NC}"

if [ -f apps/web/.env.example ] && [ ! -f apps/web/.env.local ]; then
    cp apps/web/.env.example apps/web/.env.local
    echo -e "${GREEN}✓ Created apps/web/.env.local${NC}"
else
    echo -e "${YELLOW}⚠ apps/web/.env.local already exists or no example found${NC}"
fi

if [ -f apps/server/.env.example ] && [ ! -f apps/server/.env ]; then
    cp apps/server/.env.example apps/server/.env
    echo -e "${GREEN}✓ Created apps/server/.env${NC}"
else
    echo -e "${YELLOW}⚠ apps/server/.env already exists or no example found${NC}"
fi

if [ -f .env.example ] && [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env${NC}"
fi

echo ""

# Build shared package
echo -e "${BLUE}🔧 Building shared package...${NC}"
pnpm --filter @masterdashboard/shared build 2>/dev/null || echo -e "${YELLOW}⚠ Shared package not ready yet${NC}"

echo ""

# Setup git hooks
echo -e "${BLUE}🔗 Setting up git hooks...${NC}"
if [ -d .git ]; then
    pnpm prepare 2>/dev/null || echo -e "${YELLOW}⚠ Could not setup husky hooks${NC}"
    echo -e "${GREEN}✓ Git hooks configured${NC}"
else
    echo -e "${YELLOW}⚠ Not a git repository, skipping hooks setup${NC}"
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BLUE}To start development:${NC}"
echo "  pnpm dev"
echo ""
echo -e "${BLUE}Or with Docker:${NC}"
echo "  docker-compose up -d"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  pnpm build      - Build all packages"
echo "  pnpm test       - Run tests"
echo "  pnpm lint       - Run linter"
echo "  pnpm typecheck  - Run type checker"
