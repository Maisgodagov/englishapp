import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { UserRole } from '@shared/constants/roles';

export interface AuthState {
  status: 'idle' | 'loading' | 'authenticated' | 'error';
  accessToken: string | null;
  refreshToken: string | null;
  role: UserRole | null;
  isGuest?: boolean;
  error?: string;
}

const initialState: AuthState = {
  status: 'idle',
  accessToken: null,
  refreshToken: null,
  role: null,
  error: undefined,
  isGuest: false,
};

interface AuthSuccessPayload {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
}

interface AuthUserPayload {
  token: string;
  refreshToken: string;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    startAuthentication(state) {
      state.status = 'loading';
      state.error = undefined;
    },
    authenticationSuccess(state, action: PayloadAction<AuthSuccessPayload>) {
      state.status = 'authenticated';
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.role = action.payload.role;
      state.isGuest = false;
    },
    authenticateUser(state, action: PayloadAction<AuthUserPayload>) {
      state.status = 'authenticated';
      state.accessToken = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.role = UserRole.Student;
      state.isGuest = false;
      state.error = undefined;
    },
    authenticateGuest(state) {
      state.status = 'authenticated';
      state.accessToken = null;
      state.refreshToken = null;
      state.role = null;
      state.isGuest = true;
      state.error = undefined;
    },
    authenticationFailure(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
    },
    resetAuthState() {
      return initialState;
    },
  },
});

export const {
  startAuthentication,
  authenticationSuccess,
  authenticationFailure,
  authenticateUser,
  authenticateGuest,
  resetAuthState,
} = authSlice.actions;

export const authReducer = authSlice.reducer;


