import { apiFetch } from '@shared/api/client';
import type { UserRole } from '@shared/constants/roles';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  streakDays: number;
  completedLessons: number;
  level: string;
  xpPoints: number;
}

export interface LoginResponse {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  profile: UserProfile;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
}

export const authApi = {
  login(payload: LoginRequest) {
    return apiFetch<LoginResponse>('auth/login', {
      method: 'POST',
      body: payload,
    });
  },
  register(payload: RegisterRequest) {
    return apiFetch<LoginResponse>('auth/register', {
      method: 'POST',
      body: payload,
    });
  },
};


