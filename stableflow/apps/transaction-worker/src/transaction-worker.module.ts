import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TransactionWorkerController } from './transaction-worker.controller';
import { TransactionWorkerService } from './transaction-worker.service';
import { TransactionLog } from './entities/transaction-log.entity';
import { KafkaConsumerService } from './services/kafka-consumer.service';
import { TransactionProcessorService } from './services/transaction-processor.service';
import { WalletClientService } from './services/wallet-client.service';
import { TransactionClientService } from './services/transaction-client.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3309, // Use port 3309 for worker database
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_DATABASE || 'transaction_worker',
      entities: [TransactionLog],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
      dropSchema: false,
      migrationsRun: false,
    }),
    TypeOrmModule.forFeature([TransactionLog]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  controllers: [TransactionWorkerController],
  providers: [
    TransactionWorkerService,
    KafkaConsumerService,
    TransactionProcessorService,
    WalletClientService,
    TransactionClientService,
  ],
  exports: [TransactionWorkerService],
})
export class TransactionWorkerModule {}
