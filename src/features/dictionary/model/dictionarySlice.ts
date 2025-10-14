import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { RootState } from '@core/store/store';
import { dictionaryApi } from '../api/dictionaryApi';
import type { CreateUserDictionaryEntry, UserDictionaryEntry } from '../api/dictionaryApi';

export interface DictionaryState {
  items: UserDictionaryEntry[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: string;
}

const initialState: DictionaryState = {
  items: [],
  status: 'idle',
  error: undefined,
};

interface UserPayload {
  userId: string;
}

interface AddPayload extends UserPayload {
  entry: CreateUserDictionaryEntry;
}

interface RemovePayload extends UserPayload {
  id: string;
}

export const fetchUserDictionary = createAsyncThunk<UserDictionaryEntry[], UserPayload>(
  'dictionary/fetchUserDictionary',
  async ({ userId }, { rejectWithValue }) => {
    try {
      return await dictionaryApi.getUserDictionary(userId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Не удалось загрузить словарь');
    }
  },
);

export const addUserDictionaryEntry = createAsyncThunk<UserDictionaryEntry, AddPayload>(
  'dictionary/addUserDictionaryEntry',
  async ({ userId, entry }, { rejectWithValue }) => {
    try {
      return await dictionaryApi.addUserDictionaryEntry(userId, entry);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Не удалось сохранить слово');
    }
  },
);

export const removeUserDictionaryEntry = createAsyncThunk<string, RemovePayload>(
  'dictionary/removeUserDictionaryEntry',
  async ({ userId, id }, { rejectWithValue }) => {
    try {
      await dictionaryApi.deleteUserDictionaryEntry(userId, id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Не удалось удалить слово');
    }
  },
);

const dictionarySlice = createSlice({
  name: 'dictionary',
  initialState,
  reducers: {
    resetDictionary: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserDictionary.pending, (state) => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(fetchUserDictionary.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchUserDictionary.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string | undefined;
      })
      .addCase(addUserDictionaryEntry.fulfilled, (state, action) => {
        const exists = state.items.some(
          (item) => item.word === action.payload.word && item.translation === action.payload.translation,
        );
        if (!exists) {
          state.items = [action.payload, ...state.items];
        }
      })
      .addCase(addUserDictionaryEntry.rejected, (state, action) => {
        state.error = action.payload as string | undefined;
      })
      .addCase(removeUserDictionaryEntry.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(removeUserDictionaryEntry.rejected, (state, action) => {
        state.error = action.payload as string | undefined;
      });
  },
});

export const { resetDictionary } = dictionarySlice.actions;

export const dictionaryReducer = dictionarySlice.reducer;

export const selectDictionaryItems = (state: RootState) => state.dictionary.items;
export const selectDictionaryStatus = (state: RootState) => state.dictionary.status;
export const selectDictionaryError = (state: RootState) => state.dictionary.error;

