import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../api';

export interface Transaction {
  id: number;
  type: 'MINT' | 'BURN' | 'TRANSFER';
  amount: string;
  fee: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  fromUserId?: number;
  toUserId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: number;
  userId: number;
  address: string;
  balance: string;
  frozenBalance: string;
  status: 'ACTIVE' | 'FROZEN' | 'SUSPENDED';
  currency: 'USDT' | 'USDC' | 'ETH' | 'BTC';
  createdAt: string;
}

export interface TransactionLimits {
  userId: number;
  dailyLimit: string;
  monthlyLimit: string;
  currentDaily: string;
  currentMonthly: string;
  lastResetDaily: string;
  lastResetMonthly: string;
}

interface WalletState {
  wallet: Wallet | null;
  transactions: Transaction[];
  transactionLimits: TransactionLimits | null;
  isLoading: boolean;
  error: string | null;
  transactionLoading: boolean;
  balanceLoading: boolean;
}

const initialState: WalletState = {
  wallet: null,
  transactions: [],
  transactionLimits: null,
  isLoading: false,
  error: null,
  transactionLoading: false,
  balanceLoading: false,
};

// Async thunks
export const getWalletAsync = createAsyncThunk(
  'wallet/getWallet',
  async () => {
    const response = await apiClient.get('/wallets/my-wallet');
    return response.data;
  }
);

export const getTransactionHistoryAsync = createAsyncThunk(
  'wallet/getTransactionHistory',
  async ({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) => {
    const response = await apiClient.get(`/transactions/history?page=${page}&limit=${limit}`);
    return response.data;
  }
);

export const getTransactionLimitsAsync = createAsyncThunk(
  'wallet/getTransactionLimits',
  async (userId: number) => {
    const response = await apiClient.get(`/transactions/limits/${userId}`);
    return response.data;
  }
);

export const transferFundsAsync = createAsyncThunk(
  'wallet/transferFunds',
  async ({ toUserId, amount }: { toUserId: number; amount: string }) => {
    const response = await apiClient.post('/transactions/transfer', {
      toUserId,
      amount,
    });
    return response.data;
  }
);

export const burnTokensAsync = createAsyncThunk(
  'wallet/burnTokens',
  async ({ amount }: { amount: string }) => {
    const response = await apiClient.post('/transactions/burn', { amount });
    return response.data;
  }
);

export const mintTokensAsync = createAsyncThunk(
  'wallet/mintTokens',
  async ({ toUserId, amount }: { toUserId: number; amount: string }) => {
    const response = await apiClient.post('/transactions/mint', {
      toUserId,
      amount,
    });
    return response.data;
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateBalance: (state, action: PayloadAction<string>) => {
      if (state.wallet) {
        state.wallet.balance = action.payload;
      }
    },
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions.unshift(action.payload);
    },
    updateTransactionStatus: (state, action: PayloadAction<{ id: number; status: Transaction['status'] }>) => {
      const transaction = state.transactions.find(t => t.id === action.payload.id);
      if (transaction) {
        transaction.status = action.payload.status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Get wallet
      .addCase(getWalletAsync.pending, (state) => {
        state.balanceLoading = true;
        state.error = null;
      })
      .addCase(getWalletAsync.fulfilled, (state, action) => {
        state.balanceLoading = false;
        state.wallet = action.payload.wallet;
      })
      .addCase(getWalletAsync.rejected, (state, action) => {
        state.balanceLoading = false;
        state.error = action.error.message || 'Failed to load wallet';
      })
      // Get transaction history
      .addCase(getTransactionHistoryAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getTransactionHistoryAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transactions = action.payload.transactions;
      })
      .addCase(getTransactionHistoryAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load transactions';
      })
      // Get transaction limits
      .addCase(getTransactionLimitsAsync.fulfilled, (state, action) => {
        state.transactionLimits = action.payload.limits;
      })
      // Transfer funds
      .addCase(transferFundsAsync.pending, (state) => {
        state.transactionLoading = true;
        state.error = null;
      })
      .addCase(transferFundsAsync.fulfilled, (state, action) => {
        state.transactionLoading = false;
        // Add the new transaction to the list
        state.transactions.unshift(action.payload.transaction);
      })
      .addCase(transferFundsAsync.rejected, (state, action) => {
        state.transactionLoading = false;
        state.error = action.error.message || 'Transfer failed';
      })
      // Burn tokens
      .addCase(burnTokensAsync.pending, (state) => {
        state.transactionLoading = true;
        state.error = null;
      })
      .addCase(burnTokensAsync.fulfilled, (state, action) => {
        state.transactionLoading = false;
        state.transactions.unshift(action.payload.transaction);
      })
      .addCase(burnTokensAsync.rejected, (state, action) => {
        state.transactionLoading = false;
        state.error = action.error.message || 'Burn failed';
      })
      // Mint tokens
      .addCase(mintTokensAsync.pending, (state) => {
        state.transactionLoading = true;
        state.error = null;
      })
      .addCase(mintTokensAsync.fulfilled, (state, action) => {
        state.transactionLoading = false;
        state.transactions.unshift(action.payload.transaction);
      })
      .addCase(mintTokensAsync.rejected, (state, action) => {
        state.transactionLoading = false;
        state.error = action.error.message || 'Mint failed';
      });
  },
});

export const { clearError, updateBalance, addTransaction, updateTransactionStatus } = walletSlice.actions;
export default walletSlice.reducer; 