import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MobileUser } from '@/types';
import { hasAccessToken } from '@/utils/backendApi';

const AUTH_STORAGE_KEY = 'mha_mobile_auth_state_v2';

export interface AuthState {
  user: MobileUser | null;
  isAuthenticated: boolean;
  isAuthLoaded: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isAuthLoaded: false,
};

export const loadPersistedAuth = createAsyncThunk(
  'auth/loadPersistedAuth',
  async () => {
    try {
      const json = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (json) {
        const persisted = JSON.parse(json) as Partial<AuthState>;
        if (persisted.user && await hasAccessToken()) return persisted;
        return {
          ...persisted,
          user: null,
          isAuthenticated: false,
        };
      }
    } catch (error) {
      console.warn('Failed to load persisted auth state', error);
    }
    return null;
  }
);

const saveAuthStateToStorage = async (state: AuthState) => {
  try {
    const dataToSave = {
      user: state.user,
      isAuthenticated: state.isAuthenticated,
    };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.warn('Failed to save auth state to AsyncStorage', error);
  }
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginUser: (state, action: PayloadAction<MobileUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      saveAuthStateToStorage(state);
    },
    registerUser: (state, action: PayloadAction<MobileUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      saveAuthStateToStorage(state);
    },
    logoutUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      saveAuthStateToStorage(state);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadPersistedAuth.fulfilled, (state, action) => {
      if (action.payload) {
        if (action.payload.user) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
        }
      }
      state.isAuthLoaded = true;
    });
    builder.addCase(loadPersistedAuth.rejected, (state) => {
      state.isAuthLoaded = true;
    });
  },
});

export const {
  loginUser,
  registerUser,
  logoutUser,
} = authSlice.actions;

export default authSlice.reducer;
