#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Master Dashboard development environment...${NC}"
echo ""

# Parse arguments
USE_DOCKER=false
WITH_REDIS=false
WITH_PLAYWRIGHT=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --docker) USE_DOCKER=true ;;
        --redis) WITH_REDIS=true ;;
        --playwright) WITH_PLAYWRIGHT=true ;;
        -h|--help)
            echo "Usage: ./scripts/dev.sh [options]"
            echo ""
            echo "Options:"
            echo "  --docker      Run everything in Docker"
            echo "  --redis       Start Redis container"
            echo "  --playwright  Start Playwright browser container"
            echo "  -h, --help    Show this help"
            exit 0
            ;;
        *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
    esac
    shift
done

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check for port conflicts
if check_port 3000; then
    echo -e "${YELLOW}⚠ Port 3000 is already in use${NC}"
fi

if check_port 4000; then
    echo -e "${YELLOW}⚠ Port 4000 is already in use${NC}"
fi

if $USE_DOCKER; then
    echo -e "${GREEN}Starting all services with Docker Compose...${NC}"
    docker-compose up -d
    echo ""
    echo -e "${GREEN}Services started:${NC}"
    echo "  Web:    http://localhost:3000"
    echo "  Server: http://localhost:4000"
    echo "  Redis:  localhost:6379"
    echo ""
    echo "Use 'docker-compose logs -f' to view logs"
    exit 0
fi

# Start optional services with Docker
if command -v docker &> /dev/null && docker info &> /dev/null 2>&1; then
    if $WITH_REDIS; then
        echo -e "${GREEN}Starting Redis...${NC}"
        docker-compose up -d redis
    fi

    if $WITH_PLAYWRIGHT; then
        echo -e "${GREEN}Starting Playwright browser...${NC}"
        docker-compose --profile browser up -d playwright
    fi
fi

echo ""
echo -e "${GREEN}Starting development servers...${NC}"
echo "  Web:    http://localhost:3000"
echo "  Server: http://localhost:4000"
echo ""

# Start development servers
pnpm dev
