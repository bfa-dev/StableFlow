#!/bin/bash

# StableFlow Complete Platform Startup Script
# This script starts all infrastructure services, backend microservices, and the frontend

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s $url >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    print_error "$service_name failed to start within $(($max_attempts * 2)) seconds"
    return 1
}

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -d "apps" ]; then
    print_error "Please run this script from the stableflow directory"
    exit 1
fi

print_status "🚀 Starting StableFlow Complete Platform..."
echo ""

# Step 1: Check for dependencies
print_status "📋 Checking dependencies..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is required but not installed"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    print_error "Docker is required but not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is required but not installed"
    exit 1
fi

print_success "All dependencies are available"
echo ""

# Step 2: Start Infrastructure Services
print_status "🐳 Starting infrastructure services with Docker Compose..."
docker-compose up mysql mysql-auth mysql-transactions mysql-worker mongodb redis kafka zookeeper -d

print_status "⏳ Waiting for databases to initialize (30 seconds)..."
sleep 30

# Verify infrastructure services
print_status "🔍 Verifying infrastructure services..."
for service in "mysql:3306" "mysql-auth:3307" "mysql-transactions:3308" "mysql-worker:3309" "mongodb:27017" "redis:6379" "kafka:9092"; do
    IFS=':' read -r name port <<< "$service"
    if check_port $port; then
        print_success "$name is running on port $port"
    else
        print_warning "$name may not be ready yet on port $port"
    fi
done
echo ""

# Step 3: Build the backend services
print_status "🔨 Building backend services..."
npm run build

print_success "Backend services built successfully"
echo ""

# Step 4: Start Backend Microservices with proper environment variables
print_status "⚡ Starting backend microservices..."

# Environment variables for all services
export JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Start Auth Service (Port 3001)
print_status "Starting Auth Service on port 3001..."
DB_HOST=localhost \
DB_PORT=3307 \
DB_USER=root \
DB_PASSWORD=root \
DB_DATABASE=stableflow_auth \
JWT_SECRET=$JWT_SECRET \
npm run start:auth-service > logs/auth-service.log 2>&1 &
AUTH_PID=$!

# Start Wallet Service (Port 3002)
print_status "Starting Wallet Service on port 3002..."
DB_HOST=localhost \
DB_PORT=3306 \
DB_USER=root \
DB_PASSWORD=root \
DB_DATABASE=wallet \
npm run start:wallet-service > logs/wallet-service.log 2>&1 &
WALLET_PID=$!

# Start Transaction Service (Port 3003)
print_status "Starting Transaction Service on port 3003..."
DB_HOST=localhost \
DB_PORT=3308 \
DB_USER=root \
DB_PASSWORD=root \
DB_DATABASE=transactions \
WALLET_SERVICE_URL=http://localhost:3002 \
npm run start:transaction-service > logs/transaction-service.log 2>&1 &
TRANSACTION_PID=$!

# Start Audit Service (Port 3004)
print_status "Starting Audit Service on port 3004..."
MONGODB_URI=mongodb://localhost:27017/stableflow_audit \
npm run start:audit-service > logs/audit-service.log 2>&1 &
AUDIT_PID=$!

# Start Transaction Worker (Port 3006)
print_status "Starting Transaction Worker on port 3006..."
DB_HOST=localhost \
DB_PORT=3309 \
DB_USER=root \
DB_PASSWORD=root \
DB_DATABASE=transaction_worker \
WALLET_SERVICE_URL=http://localhost:3002 \
TRANSACTION_SERVICE_URL=http://localhost:3003 \
npm run start:transaction-worker > logs/transaction-worker.log 2>&1 &
WORKER_PID=$!

echo ""
print_status "⏳ Waiting for backend services to initialize..."
sleep 10

# Wait for each service to be ready
wait_for_service "Auth Service" "http://localhost:3001/api/v1/auth/health"
wait_for_service "Wallet Service" "http://localhost:3002/api/v1/wallets/health"
wait_for_service "Transaction Service" "http://localhost:3003/api/v1/transactions/health"
wait_for_service "Audit Service" "http://localhost:3004/health"

echo ""

# Start API Gateway (Port 3000)
print_status "🌐 Starting API Gateway on port 3000..."
JWT_SECRET=$JWT_SECRET \
AUTH_SERVICE_URL=http://localhost:3001 \
WALLET_SERVICE_URL=http://localhost:3002 \
TRANSACTION_SERVICE_URL=http://localhost:3003 \
AUDIT_SERVICE_URL=http://localhost:3004 \
NOTIFICATION_SERVICE_URL=http://localhost:3005 \
PORT=3000 \
npm run start:api-gateway > logs/api-gateway.log 2>&1 &
GATEWAY_PID=$!

# Wait for API Gateway
wait_for_service "API Gateway" "http://localhost:3000/health"

echo ""

# Step 5: Start Frontend
print_status "📱 Starting Frontend on port 3010..."
cd frontend
NEXT_PUBLIC_API_URL=http://localhost:3000 \
npm run dev:3010 > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for Frontend
sleep 5
wait_for_service "Frontend" "http://localhost:3010"

echo ""
print_success "🎉 StableFlow Platform is now running!"
echo ""
echo "📊 Service Status:"
echo "  🌐 API Gateway:        http://localhost:3000"
echo "  🔐 Auth Service:       http://localhost:3001"
echo "  💰 Wallet Service:     http://localhost:3002"
echo "  🔄 Transaction Service: http://localhost:3003"
echo "  📊 Audit Service:      http://localhost:3004"
echo "  ⚡ Transaction Worker:  http://localhost:3006"
echo "  📱 Frontend App:       http://localhost:3010"
echo ""
echo "📚 API Documentation:"
echo "  Auth Service:    http://localhost:3001/api/docs"
echo "  Wallet Service:  http://localhost:3002/api/docs"
echo "  Transaction:     http://localhost:3003/api/docs"
echo "  Audit Service:   http://localhost:3004/api/docs"
echo "  API Gateway:     http://localhost:3000/api-docs"
echo ""
echo "🧪 Demo Credentials:"
echo "  Admin: admin@stableflow.com / password123"
echo "  User:  user@stableflow.com / password123"
echo ""
echo "📝 Logs are available in the logs/ directory"
echo ""

# Create a cleanup function
cleanup() {
    print_status "🛑 Shutting down StableFlow Platform..."
    
    # Kill all background processes
    [ ! -z "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
    [ ! -z "$GATEWAY_PID" ] && kill $GATEWAY_PID 2>/dev/null
    [ ! -z "$WORKER_PID" ] && kill $WORKER_PID 2>/dev/null
    [ ! -z "$AUDIT_PID" ] && kill $AUDIT_PID 2>/dev/null
    [ ! -z "$TRANSACTION_PID" ] && kill $TRANSACTION_PID 2>/dev/null
    [ ! -z "$WALLET_PID" ] && kill $WALLET_PID 2>/dev/null
    [ ! -z "$AUTH_PID" ] && kill $AUTH_PID 2>/dev/null
    
    # Stop Docker services
    docker-compose down
    
    print_success "StableFlow Platform stopped"
    exit 0
}

# Set up trap to handle Ctrl+C
trap cleanup SIGINT SIGTERM

# Keep the script running
print_status "Press Ctrl+C to stop all services"
wait 