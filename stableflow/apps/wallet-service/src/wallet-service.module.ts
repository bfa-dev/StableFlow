import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WalletServiceController } from './wallet-service.controller';
import { WalletServiceService } from './wallet-service.service';
import { Wallet } from './entities/wallet.entity';
import { BalanceHistory } from './entities/balance-history.entity';
import { WalletAddress } from './entities/wallet-address.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_DATABASE || 'wallet',
      entities: [Wallet, BalanceHistory, WalletAddress],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([Wallet, BalanceHistory, WalletAddress]),
  ],
  controllers: [WalletServiceController],
  providers: [WalletServiceService],
  exports: [WalletServiceService],
})
export class WalletServiceModule {}
