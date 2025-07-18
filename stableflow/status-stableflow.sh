#!/bin/bash

# StableFlow Platform Status Script
# This script checks the status of all StableFlow services

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
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Function to check if a port is in use and get service info
check_service() {
    local service_name=$1
    local port=$2
    local health_url=$3
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        if [ ! -z "$health_url" ] && curl -s $health_url >/dev/null 2>&1; then
            print_success "$service_name (port $port) - Running & Healthy"
        else
            echo -e "${YELLOW}[⚠]${NC} $service_name (port $port) - Running but health check failed"
        fi
    else
        print_error "$service_name (port $port) - Not running"
    fi
}

# Function to check Docker services
check_docker_service() {
    local service_name=$1
    local container_name=$2
    
    if docker-compose ps -q $service_name >/dev/null 2>&1 && [ "$(docker-compose ps $service_name | grep Up)" ]; then
        print_success "$container_name - Running"
    else
        print_error "$container_name - Not running"
    fi
}

echo ""
print_status "🔍 StableFlow Platform Status Check"
echo ""

# Check Infrastructure Services
echo "📦 Infrastructure Services:"
check_docker_service "mysql" "MySQL (Wallet DB)"
check_docker_service "mysql-auth" "MySQL Auth (Auth DB)"  
check_docker_service "mysql-transactions" "MySQL Transactions (Transaction DB)"
check_docker_service "mysql-worker" "MySQL Worker (Worker DB)"
check_docker_service "mongodb" "MongoDB (Audit DB)"
check_docker_service "redis" "Redis (Cache)"
check_docker_service "kafka" "Kafka (Message Queue)"
check_docker_service "zookeeper" "Zookeeper (Kafka Coordinator)"

echo ""
echo "🚀 Microservices:"
check_service "API Gateway" "3000" "http://localhost:3000/health"
check_service "Auth Service" "3001" "http://localhost:3001/api/v1/auth/health"
check_service "Wallet Service" "3002" "http://localhost:3002/api/v1/wallets/health"
check_service "Transaction Service" "3003" "http://localhost:3003/api/v1/transactions/health"
check_service "Audit Service" "3004" "http://localhost:3004/health"
check_service "Transaction Worker" "3006" ""
check_service "Frontend Application" "3010" "http://localhost:3010"

echo ""
echo "📚 API Documentation (if services are running):"
echo "  • Auth Service:    http://localhost:3001/api/docs"
echo "  • Wallet Service:  http://localhost:3002/api/docs"
echo "  • Transaction:     http://localhost:3003/api/docs"
echo "  • Audit Service:   http://localhost:3004/api/docs"
echo "  • API Gateway:     http://localhost:3000/api-docs"
echo ""
echo "🌐 Frontend Application:"
echo "  • StableFlow UI:   http://localhost:3010"
echo ""

# Count running services
running_infrastructure=$(docker-compose ps | grep "Up" | wc -l)
running_microservices=0

for port in 3000 3001 3002 3003 3004 3006 3010; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        ((running_microservices++))
    fi
done

echo "📊 Summary:"
echo "  Infrastructure Services: $running_infrastructure/8 running"
echo "  Microservices: $running_microservices/7 running"
echo "" 