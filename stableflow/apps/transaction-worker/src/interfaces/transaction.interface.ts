export interface TransactionMessage {
  id: string;
  type: 'MINT' | 'BURN' | 'TRANSFER' | 'BULK_TRANSFER';
  from_user_id?: number;
  to_user_id?: number;
  amount: string;
  fee: string;
  status: string;
  description?: string;
  reference_id?: string;
  metadata?: any;
  created_at: string;
}

export interface WalletUpdateRequest {
  user_id: number;
  amount: string;
  operation: 'CREDIT' | 'DEBIT';
  transaction_id: string;
  description: string;
}

export interface TransactionResult {
  success: boolean;
  transaction_id: string;
  error?: string;
  wallet_updates?: WalletUpdateRequest[];
}

export interface ProcessingContext {
  transaction: TransactionMessage;
  retry_count: number;
  max_retries: number;
  correlation_id: string;
} 