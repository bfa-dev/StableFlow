import { NestFactory } from '@nestjs/core';
import { TransactionWorkerModule } from './transaction-worker.module';

async function bootstrap() {
  const app = await NestFactory.create(TransactionWorkerModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
