import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import Cookies from 'js-cookie';
import { apiClient } from '../api';

export interface User {
  id: number;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: Cookies.get('token') || null,
  refreshToken: Cookies.get('refreshToken') || null,
  isAuthenticated: !!Cookies.get('token'),
  isLoading: false,
  error: null,
};

// Async thunks
export const loginAsync = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  }
);

export const registerAsync = createAsyncThunk(
  'auth/register',
  async ({ email, password }: { email: string; password: string }) => {
    const response = await apiClient.post('/auth/register', { email, password });
    return response.data;
  }
);

export const getCurrentUserAsync = createAsyncThunk(
  'auth/getCurrentUser',
  async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  }
);

export const refreshTokenAsync = createAsyncThunk(
  'auth/refreshToken',
  async () => {
    const refreshToken = Cookies.get('refreshToken');
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      Cookies.remove('token');
      Cookies.remove('refreshToken');
    },
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<{ token: string; refreshToken: string; user: User }>) => {
      const { token, refreshToken, user } = action.payload;
      state.token = token;
      state.refreshToken = refreshToken;
      state.user = user;
      state.isAuthenticated = true;
      state.error = null;
      
      // Set cookies with secure options
      Cookies.set('token', token, { 
        expires: 1, // 1 day
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      Cookies.set('refreshToken', refreshToken, { 
        expires: 7, // 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        const { user, accessToken, refreshToken } = action.payload;
        authSlice.caseReducers.setCredentials(state, {
          type: 'auth/setCredentials',
          payload: { token: accessToken, refreshToken, user }
        });
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Register
      .addCase(registerAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        const { user, accessToken, refreshToken } = action.payload;
        authSlice.caseReducers.setCredentials(state, {
          type: 'auth/setCredentials',
          payload: { token: accessToken, refreshToken, user }
        });
      })
      .addCase(registerAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Registration failed';
      })
      // Get current user
      .addCase(getCurrentUserAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUserAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
      })
      .addCase(getCurrentUserAsync.rejected, (state) => {
        state.isLoading = false;
        authSlice.caseReducers.logout(state);
      })
      // Refresh token
      .addCase(refreshTokenAsync.fulfilled, (state, action) => {
        const { accessToken, refreshToken } = action.payload;
        state.token = accessToken;
        state.refreshToken = refreshToken;
        Cookies.set('token', accessToken, { 
          expires: 1,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
        Cookies.set('refreshToken', refreshToken, { 
          expires: 7,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
      })
      .addCase(refreshTokenAsync.rejected, (state) => {
        authSlice.caseReducers.logout(state);
      });
  },
});

export const { logout, clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer; 