import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '@core/store/store';
import { UserRole } from '@shared/constants/roles';

export const selectUserProfile = (state: RootState) => state.user.profile;

export const selectIsAdmin = createSelector(selectUserProfile, (profile) => profile?.role === UserRole.Admin);
