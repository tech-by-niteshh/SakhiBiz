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

export const AuthService = {
  async signUp(params: SignUpParams): Promise<{ userProfile: UserProfile | null; error: string | null }> {
    try {
      const data = await apiRequest<{ success: boolean; user: any }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      if (!data?.user) {
        return { userProfile: null, error: 'Registration failed. No user returned.' };
      }

      const profile: UserProfile = {
        id: data.user.userId,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role as UserRole,
        accountStatus: data.user.accountStatus,
        preferredLanguage: data.user.language as Language,
        businessCategory: data.user.businessCategory as BusinessCategory,
        businessStage: data.user.businessStage || 'starting',
        location: data.user.location || 'India',
        isDemoUser: false,
        createdAt: data.user.createdAt || new Date().toISOString(),
        streakDays: 1,
        completedCoursesCount: 0,
      };

      return { userProfile: profile, error: null };
    } catch (err: any) {
      return { userProfile: null, error: err.message || 'Registration failed.' };
    }
  },

  async signIn(
    email: string,
    password: string
  ): Promise<{ userProfile: UserProfile | null; error: string | null }> {
    try {
      const data = await apiRequest<{ success: boolean; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!data?.user) {
        return { userProfile: null, error: 'Login failed. No user returned.' };
      }

      const profile: UserProfile = {
        id: data.user.userId,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role as UserRole,
        accountStatus: data.user.accountStatus,
        preferredLanguage: data.user.language as Language,
        businessCategory: data.user.businessCategory as BusinessCategory,
        businessStage: data.user.businessStage || 'starting',
        location: data.user.location || 'India',
        isDemoUser: false,
        createdAt: data.user.createdAt || new Date().toISOString(),
        streakDays: 1,
        completedCoursesCount: 0,
      };

      return { userProfile: profile, error: null };
    } catch (err: any) {
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

      return {
        id: data.user.userId,
        name: data.user.name,
        email: data.user.email,
        role: (data.user.role || 'USER') as UserRole,
        accountStatus: data.user.accountStatus,
        preferredLanguage: (data.user.language || 'hi') as Language,
        businessCategory: (data.user.businessCategory || 'textiles_tailoring') as BusinessCategory,
        businessStage: data.user.businessStage || 'starting',
        location: data.user.location || 'India',
        isDemoUser: false,
        createdAt: data.user.createdAt || new Date().toISOString(),
        streakDays: 1,
        completedCoursesCount: 0,
      };
    } catch {
      return null;
    }
  },

  async updateProfile(updated: Partial<UserProfile>): Promise<UserProfile> {
    const data = await apiRequest<{ success: boolean; user: any }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updated),
    });

    return {
      id: data.user.userId,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role as UserRole,
      accountStatus: data.user.accountStatus,
      preferredLanguage: data.user.language as Language,
      businessCategory: data.user.businessCategory as BusinessCategory,
      businessStage: data.user.businessStage,
      location: data.user.location,
      isDemoUser: false,
      createdAt: data.user.createdAt,
      streakDays: 1,
      completedCoursesCount: 0,
    };
  },
};
