import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TransactionServiceController } from './transaction-service.controller';
import { TransactionServiceService } from './transaction-service.service';
import { Transaction } from './entities/transaction.entity';
import { TransactionLimit } from './entities/transaction-limit.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3308, // Use port 3308 for transaction database
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_DATABASE || 'transactions',
      entities: [Transaction, TransactionLimit],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
      dropSchema: false, // Don't drop schema
      migrationsRun: false, // Don't run migrations automatically
    }),
    TypeOrmModule.forFeature([Transaction, TransactionLimit]),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [TransactionServiceController],
  providers: [TransactionServiceService],
  exports: [TransactionServiceService],
})
export class TransactionServiceModule {}
