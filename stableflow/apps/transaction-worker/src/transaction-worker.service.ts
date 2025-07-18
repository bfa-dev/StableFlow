import { Injectable } from '@nestjs/common';

@Injectable()
export class TransactionWorkerService {
  getHello(): string {
    return 'Hello World!';
  }
}
