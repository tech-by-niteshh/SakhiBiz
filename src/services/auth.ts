import { apiRequest } from '../lib/api';
import { UserProfile, Language, BusinessCategory, UserRole } from '../types';

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
  businessCategory: BusinessCategory;
  location: string;
  language: Language;
}

export interface SignUpResult {
  userProfile: UserProfile | null;
  requireVerification?: boolean;
  email?: string;
  delivery?: any;
  error: string | null;
}

export interface VerifyEmailResult {
  success: boolean;
  userProfile: UserProfile | null;
  message?: string;
  error?: string | null;
  remainingAttempts?: number;
}

export interface ResendOtpResult {
  success: boolean;
  message?: string;
  error?: string | null;
  secondsRemaining?: number;
}

export interface PasswordResetResult {
  success: boolean;
  message?: string;
  error?: string | null;
  remainingAttempts?: number;
}

function mapUserToProfile(user: any): UserProfile {
  return {
    id: user.userId,
    name: user.name,
    email: user.email,
    role: (user.role || 'USER') as UserRole,
    accountStatus: user.accountStatus,
    preferredLanguage: (user.language || 'hi') as Language,
    businessCategory: (user.businessCategory || 'textiles_tailoring') as BusinessCategory,
    businessStage: user.businessStage || 'starting',
    location: user.location || 'India',
    isDemoUser: false,
    createdAt: user.createdAt || new Date().toISOString(),
    streakDays: 1,
    completedCoursesCount: 0,
  };
}

export const AuthService = {
  async signUp(params: SignUpParams): Promise<SignUpResult> {
    try {
      const data = await apiRequest<{
        success: boolean;
        requireVerification?: boolean;
        email?: string;
        user?: any;
        delivery?: any;
        message?: string;
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      if (data?.requireVerification) {
        return {
          userProfile: null,
          requireVerification: true,
          email: data.email || params.email,
          delivery: data.delivery,
          error: null,
        };
      }

      if (data?.user) {
        return {
          userProfile: mapUserToProfile(data.user),
          requireVerification: false,
          error: null,
        };
      }

      return { userProfile: null, error: 'Registration failed. Unexpected response from server.' };
    } catch (err: any) {
      return { userProfile: null, error: err.message || 'Registration failed.' };
    }
  },

  async verifyEmail(email: string, otp: string): Promise<VerifyEmailResult> {
    try {
      const data = await apiRequest<{
        success: boolean;
        user?: any;
        message?: string;
        remainingAttempts?: number;
      }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });

      if (data?.success && data.user) {
        return {
          success: true,
          userProfile: mapUserToProfile(data.user),
          message: data.message,
        };
      }

      return {
        success: false,
        userProfile: null,
        error: data?.message || 'Verification could not be completed.',
      };
    } catch (err: any) {
      return {
        success: false,
        userProfile: null,
        error: err.message || 'Failed to verify code.',
      };
    }
  },

  async resendOtp(email: string, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD' = 'VERIFY_EMAIL'): Promise<ResendOtpResult> {
    try {
      const data = await apiRequest<{
        success: boolean;
        message?: string;
        secondsRemaining?: number;
      }>('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), purpose }),
      });

      return {
        success: !!data?.success,
        message: data?.message || 'Verification code resent.',
        secondsRemaining: data?.secondsRemaining,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to resend code.',
      };
    }
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; message?: string; error?: string | null }> {
    try {
      const data = await apiRequest<{ success: boolean; message?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });

      return {
        success: true,
        message: data?.message || 'Password reset code has been sent if an account exists.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to request password reset.',
      };
    }
  },

  async resetPassword(email: string, otp: string, newPassword: string): Promise<PasswordResetResult> {
    try {
      const data = await apiRequest<{ success: boolean; message?: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });

      return {
        success: !!data?.success,
        message: data?.message || 'Password has been reset successfully.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to reset password.',
      };
    }
  },

  async signIn(
    email: string,
    password: string
  ): Promise<{
    userProfile: UserProfile | null;
    error: string | null;
    requireVerification?: boolean;
    unverifiedEmail?: string;
  }> {
    try {
      const data = await apiRequest<{ success: boolean; user: any; error?: string; email?: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );

      if (!data?.user) {
        return { userProfile: null, error: 'Login failed. No user returned.' };
      }

      return { userProfile: mapUserToProfile(data.user), error: null };
    } catch (err: any) {
      // Check if server rejected login because email is not verified
      if (err.message && (err.message.includes('EMAIL_NOT_VERIFIED') || err.message.includes('not verified'))) {
        return {
          userProfile: null,
          error: err.message,
          requireVerification: true,
          unverifiedEmail: email.trim(),
        };
      }
      return { userProfile: null, error: err.message || 'Login failed.' };
    }
  },

  async signOut(): Promise<{ error: string | null }> {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Logout failed' };
    }
  },

  async restoreSession(): Promise<UserProfile | null> {
    try {
      const data = await apiRequest<{ user: any }>('/api/auth/me', {
        method: 'GET',
      });

      if (!data?.user) return null;
      return mapUserToProfile(data.user);
    } catch {
      return null;
    }
  },

  async updateProfile(updated: Partial<UserProfile>): Promise<UserProfile> {
    const data = await apiRequest<{ success: boolean; user: any }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updated),
    });

    return mapUserToProfile(data.user);
  },
};
