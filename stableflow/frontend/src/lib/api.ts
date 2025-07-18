import axios, { AxiosError, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';

// API Gateway base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Create axios instance
export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request ID for tracking
    config.headers['X-Request-ID'] = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          // Update cookies
          Cookies.set('token', accessToken, { 
            expires: 1,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
          });
          Cookies.set('refreshToken', newRefreshToken, { 
            expires: 7,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
          });

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        Cookies.remove('token');
        Cookies.remove('refreshToken');
        
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
    
    // Create a formatted error object
    const formattedError = {
      message: errorMessage,
      status: error.response?.status,
      code: error.response?.data?.code,
      requestId: error.response?.headers['x-request-id'],
      timestamp: new Date().toISOString(),
    };

    return Promise.reject(formattedError);
  }
);

// API endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  
  register: (email: string, password: string) =>
    apiClient.post('/auth/register', { email, password }),
  
  me: () => apiClient.get('/auth/me'),
  
  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),
  
  logout: () => apiClient.post('/auth/logout'),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.put('/auth/change-password', { currentPassword, newPassword }),
};

export const walletAPI = {
  getMyWallet: () => apiClient.get('/wallets/my-wallet'),
  
  getBalanceHistory: (page = 1, limit = 20) =>
    apiClient.get(`/wallets/balance-history?page=${page}&limit=${limit}`),
  
  generateAddress: (currency: string) =>
    apiClient.post('/wallets/generate-address', { currency }),
};

export const transactionAPI = {
  getHistory: (page = 1, limit = 20) =>
    apiClient.get(`/transactions/history?page=${page}&limit=${limit}`),
  
  getLimits: (userId: number) =>
    apiClient.get(`/transactions/limits/${userId}`),
  
  transfer: (toUserId: number, amount: string) =>
    apiClient.post('/transactions/transfer', { toUserId, amount }),
  
  burn: (amount: string) =>
    apiClient.post('/transactions/burn', { amount }),
  
  mint: (toUserId: number, amount: string) =>
    apiClient.post('/transactions/mint', { toUserId, amount }),
  
  bulkTransfer: (transfers: Array<{ toUserId: number; amount: string }>) =>
    apiClient.post('/transactions/bulk-transfer', { transfers }),
  
  getAdminStats: () =>
    apiClient.get('/transactions/admin/stats'),
};

export const auditAPI = {
  getTransactionLogs: (page = 1, limit = 20, filters?: any) =>
    apiClient.get(`/audit/transactions?page=${page}&limit=${limit}`, { params: filters }),
  
  getUserActivity: (userId: number, page = 1, limit = 20) =>
    apiClient.get(`/audit/user-activity/${userId}?page=${page}&limit=${limit}`),
  
  getSuspiciousTransactions: (page = 1, limit = 20) =>
    apiClient.get(`/audit/suspicious-transactions?page=${page}&limit=${limit}`),
  
  generateComplianceReport: (type: string, startDate: string, endDate: string) =>
    apiClient.post('/audit/generate-report', { type, startDate, endDate }),
  
  getComplianceReports: (page = 1, limit = 20) =>
    apiClient.get(`/audit/compliance-reports?page=${page}&limit=${limit}`),
};

export default apiClient; 