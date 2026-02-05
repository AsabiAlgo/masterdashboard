#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔨 Building Master Dashboard...${NC}"
echo ""

# Parse arguments
BUILD_DOCKER=false
PUSH_IMAGES=false
TAG="latest"

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --docker) BUILD_DOCKER=true ;;
        --push) PUSH_IMAGES=true ;;
        --tag) TAG="$2"; shift ;;
        -h|--help)
            echo "Usage: ./scripts/build.sh [options]"
            echo ""
            echo "Options:"
            echo "  --docker     Build Docker images"
            echo "  --push       Push images to registry (requires --docker)"
            echo "  --tag TAG    Image tag (default: latest)"
            echo "  -h, --help   Show this help"
            exit 0
            ;;
        *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
    esac
    shift
done

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
pnpm clean

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
pnpm install --frozen-lockfile

# Build all packages
echo -e "${BLUE}Building packages...${NC}"
pnpm build

if $BUILD_DOCKER; then
    echo ""
    echo -e "${BLUE}Building Docker images...${NC}"

    # Build server image
    echo -e "${GREEN}Building server image...${NC}"
    docker build \
        -f Dockerfile.server \
        --target production \
        -t masterdashboard/server:${TAG} \
        .

    # Build web image
    echo -e "${GREEN}Building web image...${NC}"
    docker build \
        -f Dockerfile.web \
        --target production \
        -t masterdashboard/web:${TAG} \
        .

    echo -e "${GREEN}✓ Docker images built${NC}"
    docker images | grep masterdashboard

    if $PUSH_IMAGES; then
        echo ""
        echo -e "${BLUE}Pushing images...${NC}"
        docker push masterdashboard/server:${TAG}
        docker push masterdashboard/web:${TAG}
        echo -e "${GREEN}✓ Images pushed${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
