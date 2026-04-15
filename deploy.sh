#!/bin/bash

# ============================================
# Deploy script for Kwelps Album on Hetzner
# ============================================

set -e

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Copy docker/.env.production to .env and fill in your values"
    exit 1
fi

# Pull latest code (if using git)
if [ -d ".git" ]; then
    echo -e "${YELLOW}📥 Pulling latest code...${NC}"
    git pull
fi

# Build and start containers
echo -e "${YELLOW}🐳 Building Docker image...${NC}"
docker compose -f docker/docker-compose.prod.yml --env-file .env build

echo -e "${YELLOW}🚀 Starting containers...${NC}"
docker compose -f docker/docker-compose.prod.yml --env-file .env up -d

# Wait for app to start
echo -e "${YELLOW}⏳ Waiting for app to start...${NC}"
sleep 10

# Health check
echo -e "${YELLOW}🏥 Checking health...${NC}"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")

if [ "$HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Deployment successful! App is healthy.${NC}"
    echo -e "${GREEN}🌐 Visit: https://kwelps.app${NC}"
else
    echo -e "${RED}❌ Health check failed with status: $HEALTH${NC}"
    echo -e "${YELLOW}Check logs: docker compose -f docker/docker-compose.prod.yml logs${NC}"
    exit 1
fi

# Show running containers
echo -e "${YELLOW}📊 Running containers:${NC}"
docker compose -f docker/docker-compose.prod.yml ps