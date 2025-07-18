import { Controller, Get } from '@nestjs/common';
import { TransactionWorkerService } from './transaction-worker.service';

@Controller()
export class TransactionWorkerController {
  constructor(private readonly transactionWorkerService: TransactionWorkerService) {}

  @Get()
  getHello(): string {
    return this.transactionWorkerService.getHello();
  }
}
