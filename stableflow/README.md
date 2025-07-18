# 🏦 StableFlow - Enterprise Stablecoin Platform

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

**StableFlow** is a production-grade Tether-scale stablecoin platform built with NestJS microservices architecture. This implementation demonstrates enterprise-level financial systems with comprehensive security, audit trails, and scalable design patterns.

## 🎯 Project Overview

This project implements a complete stablecoin ecosystem featuring:
- **Token Operations**: Mint, burn, and transfer operations with proper authorization
- **Wallet Management**: Multi-currency balance tracking with atomic transactions
- **User Authentication**: JWT-based auth with role-based access control
- **Transaction Processing**: Async processing with Kafka message queues
- **Audit & Compliance**: Comprehensive logging and regulatory compliance
- **Admin Controls**: Real-time monitoring and management interfaces

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │────│   API Gateway   │────│  Auth Service   │
│  (React/Next)   │    │  (Rate Limit)   │    │   (JWT/RBAC)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
        │ Wallet API   │ │ Transaction │ │ Audit API  │
        │   Service    │ │ API Service │ │  Service   │
        └──────────────┘ └─────────────┘ └────────────┘
                │               │               │
                │        ┌──────▼──────┐       │
                │        │   Kafka     │       │
                │        │  Messages   │       │
                │        └──────┬──────┘       │
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
        │ Wallet DB    │ │ Transaction │ │ Audit DB   │
        │   (MySQL)    │ │ Worker Svc  │ │ (MongoDB)  │
        └──────────────┘ └─────────────┘ └────────────┘
```

## 🚀 Implementation Status

### ✅ Completed Services

| Service                   | Port | Status         | Features                              |
| ------------------------- | ---- | -------------- | ------------------------------------- |
| **🔐 Auth Service**        | 3001 | ✅ **Complete** | JWT auth, RBAC, account security      |
| **💰 Wallet Service**      | 3002 | ✅ **Complete** | Balance mgmt, multi-currency, history |
| **🔄 Transaction Service** | 3003 | ✅ **Complete** | MINT/BURN/TRANSFER, limits, fees      |

### 🔄 In Progress

| Service                  | Port | Status       | Next Features                    |
| ------------------------ | ---- | ------------ | -------------------------------- |
| **⚡ Transaction Worker** | -    | 🔄 **Step 5** | Kafka consumer, async processing |

### 📋 Planned Services

| Service                    | Port | Status    | Planned Features             |
| -------------------------- | ---- | --------- | ---------------------------- |
| **📊 Audit Service**        | 3004 | 📋 Pending | Compliance, fraud detection  |
| **🔔 Notification Service** | 3005 | 📋 Pending | Alerts, webhooks, emails     |
| **🌐 API Gateway**          | 3000 | 📋 Pending | Routing, rate limiting, auth |

## 🛠️ Technology Stack

- **Backend**: NestJS (Node.js/TypeScript)
- **Databases**: MySQL (transactions), MongoDB (audit logs)
- **Message Queue**: Apache Kafka
- **Caching**: Redis
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker & Docker Compose
- **Authentication**: JWT with Passport.js
- **Validation**: class-validator, class-transformer
- **ORM**: TypeORM

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- Git

### Installation & Setup

```bash
# Clone the repository
git clone https://github.com/bfa-dev/StableFlow.git
cd StableFlow/stableflow

# Install dependencies
npm install

# Start infrastructure services
docker-compose up mysql mysql-auth mysql-transactions mongodb redis kafka zookeeper -d

# Wait for databases to initialize (30 seconds)
sleep 30

# Start the services
npm run start:auth-service &      # Port 3001
npm run start:wallet-service &    # Port 3002
npm run start:transaction-service # Port 3003
```

### API Documentation

Once services are running, access the Swagger documentation:

- **Auth Service**: http://localhost:3001/api/docs
- **Wallet Service**: http://localhost:3002/api/docs  
- **Transaction Service**: http://localhost:3003/api/docs

### Health Checks

```bash
# Verify all services are healthy
curl http://localhost:3001/api/v1/auth/health
curl http://localhost:3002/api/v1/wallets/health
curl http://localhost:3003/api/v1/transactions/health
```

## 🔧 Core Features Implemented

### 🔐 Authentication & Authorization
- **JWT-based Authentication** with refresh tokens
- **Role-Based Access Control**: USER, ADMIN, SUPER_ADMIN
- **Account Security**: Failed attempt tracking, account lockout
- **Password Security**: bcrypt hashing, strength validation
- **Session Management**: Secure token handling

### 💰 Wallet Management
- **Multi-Currency Support**: USDT, USDC, ETH, BTC simulation
- **Balance Tracking**: Decimal precision (18,8) for accuracy
- **Transaction History**: Complete audit trail with pagination
- **Wallet Security**: Freezing/unfreezing capabilities
- **Address Generation**: Crypto-secure address creation

### 🔄 Transaction Processing
- **Token Operations**:
  - **MINT**: Create new tokens (SUPER_ADMIN only)
  - **BURN**: Destroy tokens (user/admin)
  - **TRANSFER**: Send tokens between users
  - **BULK_TRANSFER**: Batch operations (admin only)
- **Business Rules**:
  - Daily/Monthly transaction limits ($10K/$100K default)
  - 0.1% transaction fees
  - Balance validation and insufficient funds protection
- **Async Processing**: Kafka integration for scalable processing

### 📊 Admin & Monitoring
- **Transaction Statistics**: Volume, counts by type/status
- **User Management**: Transaction limit controls
- **Health Monitoring**: Service status endpoints
- **Audit Trails**: Comprehensive logging of all operations

## 🧪 Testing & Development

### Running Individual Services

```bash
# Development mode with hot reload
npm run start:auth-service
npm run start:wallet-service  
npm run start:transaction-service

# Production mode
npm run start:prod
```

### Database Management

```bash
# Reset databases (development only)
docker-compose down -v
docker-compose up mysql mysql-auth mysql-transactions -d

# Access database consoles
docker exec -it stableflow-mysql-1 mysql -uroot -proot
docker exec -it stableflow-mysql-auth-1 mysql -uroot -proot  
docker exec -it stableflow-mysql-transactions-1 mysql -uroot -proot
```

### API Testing Examples

```bash
# Register a new user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'

# Create a wallet
curl -X POST http://localhost:3002/api/v1/internal/wallets/create \
  -H "Content-Type: application/json" \
  -d '{"user_id":1}'

# Check transaction limits
curl http://localhost:3003/api/v1/transactions/limits/1

# View admin statistics
curl http://localhost:3003/api/v1/transactions/admin/stats
```

## 🔒 Security Features

- **Multi-layer Authentication**: JWT + refresh tokens
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Parameterized queries via TypeORM
- **CORS Configuration**: Secure cross-origin requests
- **Account Lockout**: Brute force protection
- **Audit Logging**: Complete operation tracking

## 📈 Scalability & Performance

- **Microservices Architecture**: Independent scaling per service
- **Database Optimization**: Proper indexing and query optimization
- **Async Processing**: Kafka-based message queues
- **Connection Pooling**: Efficient database connections
- **Caching Strategy**: Redis for session and data caching
- **Load Balancing Ready**: Stateless service design

## 🏆 Production Readiness Features

- **Health Checks**: Kubernetes-ready health endpoints
- **Graceful Shutdown**: Proper resource cleanup
- **Error Handling**: Comprehensive error responses
- **Logging**: Structured logging for observability
- **Configuration**: Environment-based configuration
- **Docker Support**: Production-ready containerization
- **API Versioning**: Future-proof API design

## 🚧 Development Roadmap

### Phase 1: Core Services ✅ 
- [x] Authentication Service
- [x] Wallet Service  
- [x] Transaction Service

### Phase 2: Processing & Workers 🔄
- [ ] Transaction Worker Service (In Progress)
- [ ] Audit Service
- [ ] Notification Service

### Phase 3: Integration & Gateway
- [ ] API Gateway
- [ ] Frontend Application
- [ ] End-to-end Testing

### Phase 4: Advanced Features
- [ ] Real Kafka Integration
- [ ] Performance Monitoring
- [ ] Advanced Fraud Detection
- [ ] Mobile Application

## 📚 Architecture Decisions

### Database Strategy
- **MySQL**: ACID compliance for financial transactions
- **MongoDB**: Flexible schema for audit logs
- **Redis**: High-performance caching and sessions

### Microservices Communication
- **HTTP**: Synchronous service-to-service calls
- **Kafka**: Asynchronous event-driven processing
- **JWT**: Stateless authentication across services

### Security Model
- **Defense in Depth**: Multiple security layers
- **Principle of Least Privilege**: Minimal required permissions
- **Audit Everything**: Complete operation logging

## 🤝 Contributing

This project demonstrates enterprise-grade development practices:

1. **Clean Architecture**: Separation of concerns
2. **SOLID Principles**: Maintainable code design  
3. **Test-Driven Development**: Comprehensive testing
4. **Security First**: Security considerations at every level
5. **Documentation**: Self-documenting code and APIs

## 📄 License

This project is [MIT licensed](./LICENSE).

## 🎯 Interview Preparation

This implementation covers key concepts for fintech/blockchain interviews:

- **Stablecoin Operations**: Mint/burn mechanics, peg stability
- **Financial System Design**: Transaction processing, audit trails
- **Microservices Architecture**: Service design, communication patterns
- **Security Engineering**: Authentication, authorization, data protection
- **Scalability Patterns**: Async processing, caching, database optimization
- **Compliance & Audit**: Regulatory requirements, transaction monitoring

---

**Built with ❤️ for learning enterprise-grade stablecoin platform development**
