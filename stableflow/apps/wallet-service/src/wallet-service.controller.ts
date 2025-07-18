import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { WalletServiceService } from './wallet-service.service';
import {
  CreateWalletDto,
  UpdateBalanceDto,
  FreezeWalletDto,
  GenerateAddressDto,
  WalletResponseDto,
  BalanceHistoryResponseDto,
  WalletAddressResponseDto,
  BalanceQueryDto,
} from './dto/wallet.dto';
import { Currency } from './entities/wallet-address.entity';

@ApiTags('Wallets')
@Controller()
export class WalletServiceController {
  constructor(private readonly walletService: WalletServiceService) {}

  // Internal APIs (service-to-service communication)
  @Post('internal/wallets/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create wallet (Internal API)' })
  @ApiResponse({
    status: 201,
    description: 'Wallet created successfully',
    type: WalletResponseDto,
  })
  @ApiResponse({ status: 409, description: 'User already has a wallet for this currency' })
  async createWallet(
    @Body(ValidationPipe) createWalletDto: CreateWalletDto,
  ): Promise<WalletResponseDto> {
    return this.walletService.createWallet(createWalletDto);
  }

  @Get('internal/wallets/balance/:userId')
  @ApiOperation({ summary: 'Get wallet balance by user ID (Internal API)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'currency', enum: Currency, required: false })
  @ApiResponse({
    status: 200,
    description: 'Wallet balance retrieved successfully',
    type: [WalletResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getWalletBalance(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('currency') currency?: Currency,
  ): Promise<WalletResponseDto[]> {
    return this.walletService.getWalletByUserId(userId, currency);
  }

  @Post('internal/wallets/update-balance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update wallet balance (Internal API)' })
  @ApiResponse({
    status: 200,
    description: 'Balance updated successfully',
    type: WalletResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid amount or insufficient balance' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async updateBalance(
    @Body(ValidationPipe) updateBalanceDto: UpdateBalanceDto,
  ): Promise<WalletResponseDto> {
    return this.walletService.updateBalance(updateBalanceDto);
  }

  @Post('internal/wallets/freeze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Freeze wallet (Internal API)' })
  @ApiResponse({
    status: 200,
    description: 'Wallet frozen successfully',
    type: WalletResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  @ApiResponse({ status: 400, description: 'Wallet already frozen' })
  async freezeWallet(
    @Body(ValidationPipe) freezeWalletDto: FreezeWalletDto,
  ): Promise<WalletResponseDto> {
    return this.walletService.freezeWallet(freezeWalletDto);
  }

  @Post('internal/wallets/unfreeze/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfreeze wallet (Internal API)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'amount', required: false, description: 'Amount to unfreeze (optional)' })
  @ApiResponse({
    status: 200,
    description: 'Wallet unfrozen successfully',
    type: WalletResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async unfreezeWallet(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('amount') amount?: string,
  ): Promise<WalletResponseDto> {
    return this.walletService.unfreezeWallet(userId, amount);
  }

  // Public APIs (user-facing)
  @Get('wallets/my-wallet/:userId')
  @ApiOperation({ summary: 'Get user wallets' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'currency', enum: Currency, required: false })
  @ApiResponse({
    status: 200,
    description: 'Wallets retrieved successfully',
    type: [WalletResponseDto],
  })
  @ApiResponse({ status: 404, description: 'No wallets found' })
  async getMyWallet(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('currency') currency?: Currency,
  ): Promise<WalletResponseDto[]> {
    return this.walletService.getWalletByUserId(userId, currency);
  }

  @Get('wallets/balance-history/:userId')
  @ApiOperation({ summary: 'Get wallet balance history' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Balance history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getBalanceHistory(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() queryDto: BalanceQueryDto,
  ): Promise<{ data: BalanceHistoryResponseDto[]; total: number; page: number; limit: number }> {
    return this.walletService.getBalanceHistory(userId, queryDto);
  }

  @Post('wallets/generate-address/:userId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate new wallet address' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 201,
    description: 'Address generated successfully',
    type: WalletAddressResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async generateAddress(
    @Param('userId', ParseIntPipe) userId: number,
    @Body(ValidationPipe) generateAddressDto: GenerateAddressDto,
  ): Promise<WalletAddressResponseDto> {
    return this.walletService.generateAddress(userId, generateAddressDto);
  }

  @Get('wallets/addresses/:userId')
  @ApiOperation({ summary: 'Get all wallet addresses for user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Addresses retrieved successfully',
    type: [WalletAddressResponseDto],
  })
  @ApiResponse({ status: 404, description: 'No wallets found' })
  async getWalletAddresses(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<WalletAddressResponseDto[]> {
    return this.walletService.getWalletAddresses(userId);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
