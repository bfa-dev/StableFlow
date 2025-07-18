import { Module } from '@nestjs/common';
import { TransactionWorkerController } from './transaction-worker.controller';
import { TransactionWorkerService } from './transaction-worker.service';

@Module({
  imports: [],
  controllers: [TransactionWorkerController],
  providers: [TransactionWorkerService],
})
export class TransactionWorkerModule {}
