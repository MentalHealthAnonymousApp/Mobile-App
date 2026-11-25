import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'mha_mobile_app_state_v1';

export interface AppState {
  isHydrated: boolean;
  onboardingComplete: boolean;
  notificationsEnabled: boolean;
}

const initialState: AppState = {
  isHydrated: false,
  onboardingComplete: false,
  notificationsEnabled: true,
};

export const loadPersistedAppState = createAsyncThunk(
  'app/loadPersistedAppState',
  async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        return JSON.parse(json) as Partial<AppState>;
      }
    } catch (error) {
      console.warn('Failed to load persisted app state', error);
    }
    return null;
  }
);

export const saveAppStateToStorage = async (state: AppState) => {
  try {
    const dataToSave = {
      onboardingComplete: state.onboardingComplete,
      notificationsEnabled: state.notificationsEnabled,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.warn('Failed to save app state to AsyncStorage', error);
  }
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    completeOnboarding: (state) => {
      state.onboardingComplete = true;
      saveAppStateToStorage(state);
    },
    resetOnboarding: (state) => {
      state.onboardingComplete = false;
      saveAppStateToStorage(state);
    },
    setNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.notificationsEnabled = action.payload;
      saveAppStateToStorage(state);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadPersistedAppState.fulfilled, (state, action) => {
      if (action.payload) {
        if (typeof action.payload.onboardingComplete === 'boolean') {
          state.onboardingComplete = action.payload.onboardingComplete;
        }
        if (typeof action.payload.notificationsEnabled === 'boolean') {
          state.notificationsEnabled = action.payload.notificationsEnabled;
        }
      }
      state.isHydrated = true;
    });
    builder.addCase(loadPersistedAppState.rejected, (state) => {
      state.isHydrated = true;
    });
  },
});

export const {
  completeOnboarding,
  resetOnboarding,
  setNotificationsEnabled,
} = appSlice.actions;

export default appSlice.reducer;
