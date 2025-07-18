#!/bin/bash

# StableFlow Platform Stop Script
# This script stops all running StableFlow services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_status "🛑 Stopping StableFlow Platform..."

# Stop Node.js services by port
print_status "Stopping Node.js services..."
for port in 3000 3001 3002 3003 3004 3005 3006 3010; do
    pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        kill $pid 2>/dev/null
        print_success "Stopped service on port $port (PID: $pid)"
    else
        print_warning "No service found on port $port"
    fi
done

# Stop Docker Compose services
print_status "Stopping Docker Compose services..."
docker-compose down

print_success "🎉 All StableFlow services have been stopped" 