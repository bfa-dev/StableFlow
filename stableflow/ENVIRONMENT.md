# StableFlow Environment Variables Configuration

This document outlines all environment variables required by each service in the StableFlow platform.

## 🐳 Infrastructure Services (Docker Compose)

### MySQL Databases
- **mysql** (port 3306) - Wallet Service database
- **mysql-auth** (port 3307) - Auth Service database  
- **mysql-transactions** (port 3308) - Transaction Service database
- **mysql-worker** (port 3309) - Transaction Worker database
- **mongodb** (port 27017) - Audit Service database
- **redis** (port 6379) - Caching and sessions
- **kafka** (port 9092) - Message queue
- **zookeeper** (port 2181) - Kafka coordinator

## 🔐 Auth Service (Port 3001)

**Required Environment Variables:**
```bash
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=stableflow_auth
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Database:** mysql-auth (port 3307)
**Dependencies:** None

## 💰 Wallet Service (Port 3002)

**Required Environment Variables:**
```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=wallet
```

**Database:** mysql (port 3306)  
**Dependencies:** None

## 🔄 Transaction Service (Port 3003)

**Required Environment Variables:**
```bash
DB_HOST=localhost
DB_PORT=3308
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=transactions
WALLET_SERVICE_URL=http://localhost:3002
```

**Database:** mysql-transactions (port 3308)
**Dependencies:** Wallet Service

## 📊 Audit Service (Port 3004)

**Required Environment Variables:**
```bash
MONGODB_URI=mongodb://localhost:27017/stableflow_audit
```

**Database:** mongodb (port 27017)
**Dependencies:** None

## ⚡ Transaction Worker (Port 3006)

**Required Environment Variables:**
```bash
DB_HOST=localhost
DB_PORT=3309
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=transaction_worker
WALLET_SERVICE_URL=http://localhost:3002
TRANSACTION_SERVICE_URL=http://localhost:3003
KAFKA_BROKER=localhost:9092
```

**Database:** mysql-worker (port 3309)
**Dependencies:** Wallet Service, Transaction Service, Kafka

## 🌐 API Gateway (Port 3000)

**Required Environment Variables:**
```bash
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
AUTH_SERVICE_URL=http://localhost:3001
WALLET_SERVICE_URL=http://localhost:3002
TRANSACTION_SERVICE_URL=http://localhost:3003
AUDIT_SERVICE_URL=http://localhost:3004
NOTIFICATION_SERVICE_URL=http://localhost:3005
PORT=3000
```

**Database:** None (stateless)
**Dependencies:** All backend services

## 📱 Frontend Application (Port 3010)

**Required Environment Variables:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=StableFlow
NEXT_PUBLIC_APP_DESCRIPTION="Enterprise Stablecoin Platform"
```

**Database:** None
**Dependencies:** API Gateway

## 🚀 Service Startup Order

The correct startup order to ensure all dependencies are met:

1. **Infrastructure Services** (Docker Compose)
   - MySQL databases
   - MongoDB  
   - Redis
   - Kafka + Zookeeper

2. **Core Services** (can start in parallel)
   - Auth Service
   - Wallet Service  
   - Audit Service

3. **Business Logic Services** (depend on core services)
   - Transaction Service (depends on Wallet Service)
   - Transaction Worker (depends on Wallet + Transaction Services)

4. **Gateway & Frontend**
   - API Gateway (depends on all backend services)
   - Frontend (depends on API Gateway)

## 🛠️ Development vs Production

### Development Environment
- Databases run in Docker containers on localhost
- Services communicate via localhost URLs
- JWT secrets can use default values
- Database synchronization enabled
- Detailed logging enabled

### Production Environment
- Use managed database services (AWS RDS, MongoDB Atlas)
- Services communicate via internal DNS/service discovery
- JWT secrets must be secure and unique
- Database migrations instead of synchronization
- Structured logging with log aggregation

## 🔒 Security Considerations

1. **JWT_SECRET**: Must be a cryptographically secure random string in production
2. **Database Passwords**: Use strong passwords and consider secret management
3. **Service URLs**: Use HTTPS in production
4. **CORS Origins**: Restrict to known domains in production
5. **Environment Files**: Never commit .env files with real credentials

## 📝 Environment File Templates

### Backend Services (.env)
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=database_name

# Service URLs
WALLET_SERVICE_URL=http://localhost:3002
TRANSACTION_SERVICE_URL=http://localhost:3003
AUTH_SERVICE_URL=http://localhost:3001
AUDIT_SERVICE_URL=http://localhost:3004

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Infrastructure
MONGODB_URI=mongodb://localhost:27017/stableflow_audit
KAFKA_BROKER=localhost:9092
REDIS_URL=redis://localhost:6379
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=StableFlow
NEXT_PUBLIC_APP_DESCRIPTION="Enterprise Stablecoin Platform"
NEXT_PUBLIC_ENABLE_PWA=true
```

## 🔧 Troubleshooting

### Common Issues

1. **Port Already In Use**
   ```bash
   # Find process using port
   lsof -i :3001
   
   # Kill process
   kill -9 <PID>
   ```

2. **Database Connection Failed**
   - Check if Docker containers are running: `docker-compose ps`
   - Verify port numbers match between service config and Docker Compose
   - Wait longer for database initialization (especially MySQL)

3. **Service Communication Failed**
   - Verify service URLs in environment variables
   - Check if dependent services are healthy
   - Use `./status-stableflow.sh` to check service status

4. **Frontend API Calls Failing**
   - Ensure API Gateway is running on port 3000
   - Check CORS configuration in API Gateway
   - Verify `NEXT_PUBLIC_API_URL` matches API Gateway URL

### Health Check URLs

- Auth Service: `http://localhost:3001/api/v1/auth/health`
- Wallet Service: `http://localhost:3002/api/v1/wallets/health`  
- Transaction Service: `http://localhost:3003/api/v1/transactions/health`
- Audit Service: `http://localhost:3004/health`
- API Gateway: `http://localhost:3000/health`
- Frontend: `http://localhost:3010` 