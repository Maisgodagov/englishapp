import { apiFetch } from '@shared/api/client';

export interface StreakResponse {
  streakDays: number;
  lastActivityDate: string;
}

const headersWithUser = (userId: string) => ({ 'x-user-id': userId });

export const streakApi = {
  refresh(userId: string) {
    return apiFetch<StreakResponse>('streak/refresh', {
      method: 'POST',
      headers: headersWithUser(userId),
    });
  },
};


