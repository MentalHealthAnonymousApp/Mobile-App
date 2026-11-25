import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Article, DeliveryMethod, PackageCredit, Recipient, Topic } from '@/types';

export interface ShareState {
  selectedTopic: Topic | null;
  selectedArticles: Article[];
  recipient: Recipient | null;
  message: string;
  /** The paid package credit this message will use. */
  credit: PackageCredit | null;
}

const initialState: ShareState = {
  selectedTopic: null,
  selectedArticles: [],
  recipient: null,
  message: '',
  credit: null,
};

export const shareSlice = createSlice({
  name: 'share',
  initialState,
  reducers: {
    setSelectedTopic: (state, action: PayloadAction<Topic>) => {
      state.selectedTopic = action.payload;
    },
    setSelectedArticles: (state, action: PayloadAction<Article[]>) => {
      state.selectedArticles = action.payload;
    },
    toggleArticleSelection: (state, action: PayloadAction<Article>) => {
      const exists = state.selectedArticles.some((a) => a.id === action.payload.id);
      if (exists) {
        state.selectedArticles = state.selectedArticles.filter(
          (a) => a.id !== action.payload.id
        );
      } else {
        state.selectedArticles.push(action.payload);
      }
    },
    selectAllArticles: (state, action: PayloadAction<Article[]>) => {
      state.selectedArticles = action.payload;
    },
    clearSelectedArticles: (state) => {
      state.selectedArticles = [];
    },
    setRecipient: (state, action: PayloadAction<Recipient>) => {
      state.recipient = action.payload;
    },
    setDeliveryMethod: (state, action: PayloadAction<DeliveryMethod>) => {
      if (state.recipient) {
        state.recipient.method = action.payload;
      } else {
        state.recipient = { method: action.payload };
      }
    },
    setMessage: (state, action: PayloadAction<string>) => {
      state.message = action.payload;
    },
    setCredit: (state, action: PayloadAction<PackageCredit | null>) => {
      state.credit = action.payload;
      // The Basic package does not include resource attachments.
      if (action.payload?.packageTier === 'basic') state.selectedArticles = [];
    },
    resetShareFlow: (state) => {
      state.selectedTopic = null;
      state.selectedArticles = [];
      state.recipient = null;
      state.message = '';
      state.credit = null;
    },
  },
});

export const {
  setSelectedTopic,
  setSelectedArticles,
  toggleArticleSelection,
  selectAllArticles,
  clearSelectedArticles,
  setRecipient,
  setDeliveryMethod,
  setMessage,
  setCredit,
  resetShareFlow,
} = shareSlice.actions;

export default shareSlice.reducer;

