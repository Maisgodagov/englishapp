import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { UserRole } from '@shared/constants/roles';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  streakDays: number;
  completedLessons: number;
  level: string;
  xpPoints: number;
}

export interface UserState {
  profile?: UserProfile;
}

const initialState: UserState = {
  profile: undefined,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<UserProfile>) {
      state.profile = action.payload;
    },
    clearProfile(state) {
      state.profile = undefined;
    },
  },
});

export const { setProfile, clearProfile } = userSlice.actions;
export const userReducer = userSlice.reducer;


