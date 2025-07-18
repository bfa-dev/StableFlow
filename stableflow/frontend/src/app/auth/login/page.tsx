'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RootState, AppDispatch } from '@/lib/store';
import { loginAsync, clearError } from '@/lib/slices/authSlice';
import { addNotification } from '@/lib/slices/uiSlice';
import {
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const { isAuthenticated, isLoading, error } = useSelector((state: RootState) => state.auth);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Clear Redux error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const result = await dispatch(loginAsync(formData));

      if (loginAsync.fulfilled.match(result)) {
        dispatch(addNotification({
          type: 'success',
          title: 'Login Successful',
          message: 'Welcome back to StableFlow!',
          duration: 3000,
        }));
        router.push('/');
      } else if (loginAsync.rejected.match(result)) {
        dispatch(addNotification({
          type: 'error',
          title: 'Login Failed',
          message: result.error.message || 'Invalid email or password',
          duration: 5000,
        }));
      }
    } catch (err) {
      dispatch(addNotification({
        type: 'error',
        title: 'Login Error',
        message: 'An unexpected error occurred. Please try again.',
        duration: 5000,
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear field-specific error when user starts typing
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            StableFlow
          </h1>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Access your stablecoin platform
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-gray-800 py-8 px-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`
                    block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-300
                    ${formErrors.email
                      ? 'border-red-300 dark:border-red-600'
                      : 'border-gray-300 dark:border-gray-600'
                    }
                  `}
                  placeholder="Enter your email"
                />
              </div>
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {formErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`
                    block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-300
                    ${formErrors.password
                      ? 'border-red-300 dark:border-red-600'
                      : 'border-gray-300 dark:border-gray-600'
                    }
                  `}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {formErrors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="
                  group relative w-full flex justify-center py-2 px-4 border border-transparent 
                  text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                  dark:bg-blue-500 dark:hover:bg-blue-600
                  transition-colors duration-200
                "
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" className="text-white" />
                ) : (
                  'Sign In'
                )}
              </button>
            </div>

            {/* Demo Credentials */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center mb-2">
                Demo Credentials:
              </p>
              <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                <p><strong>Admin:</strong> admin@stableflow.com / password123</p>
                <p><strong>User:</strong> user@stableflow.com / password123</p>
              </div>
            </div>
          </form>
        </div>

        {/* Register Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link
              href="/auth/register"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 