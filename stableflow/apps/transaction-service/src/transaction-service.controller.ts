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
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TransactionServiceService } from './transaction-service.service';
import {
  MintTokensDto,
  BurnTokensDto,
  TransferTokensDto,
  BulkTransferDto,
  UpdateTransactionLimitsDto,
  TransactionResponseDto,
  TransactionLimitResponseDto,
  TransactionQueryDto,
} from './dto/transaction.dto';

// Mock interfaces for authentication (in real app, would come from auth service)
interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    role: string;
  };
}

@ApiTags('Transactions')
@Controller('transactions')
// @UseGuards(JwtAuthGuard) // Would use actual auth guard from auth service
export class TransactionServiceController {
  constructor(private readonly transactionService: TransactionServiceService) {}

  @Post('mint')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mint new tokens (SUPER_ADMIN only)' })
  @ApiResponse({
    status: 201,
    description: 'Tokens minted successfully',
    type: TransactionResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Only SUPER_ADMIN can mint tokens' })
  @ApiResponse({ status: 400, description: 'Invalid mint amount or target user' })
  @ApiResponse({ status: 404, description: 'Target user wallet not found' })
  async mintTokens(
    @Body(ValidationPipe) mintDto: MintTokensDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<TransactionResponseDto> {
    // In real implementation, user would come from JWT token
    const mockUser = { id: 1, email: 'admin@example.com', role: 'SUPER_ADMIN' };
    return this.transactionService.mintTokens(mintDto, mockUser);
  }

  @Post('burn')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Burn tokens' })
  @ApiResponse({
    status: 201,
    description: 'Tokens burned successfully',
    type: TransactionResponseDto,
  })
  @ApiResponse({ status: 403, description: 'You can only burn your own tokens' })
  @ApiResponse({ status: 400, description: 'Invalid burn amount or insufficient balance' })
  @ApiResponse({ status: 404, description: 'Source user wallet not found' })
  async burnTokens(
    @Body(ValidationPipe) burnDto: BurnTokensDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<TransactionResponseDto> {
    // In real implementation, user would come from JWT token
    const mockUser = { id: 1, email: 'user@example.com', role: 'USER' };
    return this.transactionService.burnTokens(burnDto, mockUser);
  }

  @Post('transfer')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Transfer tokens between users' })
  @ApiResponse({
    status: 201,
    description: 'Tokens transferred successfully',
    type: TransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid transfer amount, insufficient balance, or cannot transfer to yourself' })
  @ApiResponse({ status: 404, description: 'Source or target wallet not found' })
  async transferTokens(
    @Body(ValidationPipe) transferDto: TransferTokensDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<TransactionResponseDto> {
    // In real implementation, user would come from JWT token
    const mockUser = { id: 1, email: 'user@example.com', role: 'USER' };
    return this.transactionService.transferTokens(transferDto, mockUser);
  }

  @Post('bulk-transfer')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk transfer tokens (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Bulk transfer completed successfully',
    type: [TransactionResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Only admins can perform bulk transfers' })
  @ApiResponse({ status: 400, description: 'Invalid transfer data or insufficient balance' })
  async bulkTransfer(
    @Body(ValidationPipe) bulkTransferDto: BulkTransferDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<TransactionResponseDto[]> {
    // In real implementation, user would come from JWT token
    const mockUser = { id: 1, email: 'admin@example.com', role: 'ADMIN' };
    return this.transactionService.bulkTransfer(bulkTransferDto, mockUser);
  }

  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiResponse({
    status: 200,
    description: 'Transaction history retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTransactionHistory(
    @Query() queryDto: TransactionQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ data: TransactionResponseDto[]; total: number; page: number; limit: number }> {
    // In real implementation, user would come from JWT token
    const mockUser = { id: 1, email: 'user@example.com', role: 'USER' };
    return this.transactionService.getTransactionHistory(queryDto, mockUser);
  }

  @Get('limits/:userId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction limits for user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction limits retrieved successfully',
    type: TransactionLimitResponseDto,
  })
  @ApiResponse({ status: 403, description: 'You can only view your own transaction limits' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getTransactionLimits(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<TransactionLimitResponseDto> {
    // In real implementation, user would come from JWT token
    const mockUser = { id: 1, email: 'user@example.com', role: 'USER' };
    return this.transactionService.getTransactionLimits(userId, mockUser);
  }

  @Put('limits')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update transaction limits (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Transaction limits updated successfully',
    type: TransactionLimitResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Only admins can update transaction limits' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateTransactionLimits(
    @Body(ValidationPipe) updateDto: UpdateTransactionLimitsDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<TransactionLimitResponseDto> {
    // In real implementation, user would come from JWT token
    const mockUser = { id: 1, email: 'admin@example.com', role: 'ADMIN' };
    return this.transactionService.updateTransactionLimits(updateDto, mockUser);
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

  // Internal API endpoints for service-to-service communication
  @Get('internal/transaction/:id')
  @ApiOperation({ summary: 'Get transaction by ID (Internal API)' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully',
    type: TransactionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionById(
    @Param('id') id: string,
  ): Promise<TransactionResponseDto> {
    // This would be implemented to get transaction by ID for internal services
    // For now, return a mock response
    throw new Error('Not implemented - would fetch transaction by ID');
  }

  @Post('internal/process-transaction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process pending transaction (Internal API)' })
  @ApiResponse({
    status: 200,
    description: 'Transaction processed successfully',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async processTransaction(
    @Body() processDto: { transaction_id: string; status: string; failure_reason?: string },
  ): Promise<{ success: boolean; message: string }> {
    // This would be called by the transaction worker service
    // For now, return a mock response
    return {
      success: true,
      message: 'Transaction processed successfully',
    };
  }

  // Admin endpoints for monitoring and management
  @Get('admin/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Transaction statistics retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getTransactionStats(
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    total_transactions: number;
    total_volume: string;
    transactions_by_type: Record<string, number>;
    transactions_by_status: Record<string, number>;
  }> {
    // This would return comprehensive transaction statistics
    return {
      total_transactions: 1500,
      total_volume: '2500000.00000000',
      transactions_by_type: {
        MINT: 50,
        BURN: 75,
        TRANSFER: 1200,
        BULK_TRANSFER: 175,
      },
      transactions_by_status: {
        PENDING: 25,
        PROCESSING: 10,
        COMPLETED: 1450,
        FAILED: 15,
        CANCELLED: 0,
      },
    };
  }

  @Get('admin/pending')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending transactions (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Pending transactions retrieved successfully',
    type: [TransactionResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getPendingTransactions(
    @Req() req: AuthenticatedRequest,
  ): Promise<TransactionResponseDto[]> {
    // In real implementation, user would come from JWT token
    const mockUser = { id: 1, email: 'admin@example.com', role: 'ADMIN' };
    
    // This would return all pending transactions for admin monitoring
    const queryDto: TransactionQueryDto = {
      status: 'PENDING' as any,
      limit: 100,
    };
    
    const result = await this.transactionService.getTransactionHistory(queryDto, mockUser);
    return result.data;
  }
}
