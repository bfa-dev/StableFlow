import { Test, TestingModule } from '@nestjs/testing';
import { TransactionWorkerController } from './transaction-worker.controller';
import { TransactionWorkerService } from './transaction-worker.service';

describe('TransactionWorkerController', () => {
  let transactionWorkerController: TransactionWorkerController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [TransactionWorkerController],
      providers: [TransactionWorkerService],
    }).compile();

    transactionWorkerController = app.get<TransactionWorkerController>(TransactionWorkerController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(transactionWorkerController.getHello()).toBe('Hello World!');
    });
  });
});
