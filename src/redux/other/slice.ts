import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface State {
  loading: {
    tip?: string;
    visible: boolean;
  };
  error?: {
    type: string;
    detail: string;
  };
}

const initialState: State = {
  loading: {
    visible: false,
  },
};

export const slice = createSlice({
  name: 'Other',
  initialState,
  reducers: {
    toggleLoading(state, action: PayloadAction<{ tip?: string; visible: boolean }>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<{ type: string; detail: string } | undefined>) {
      state.error = action.payload;
    },
  },
});

export const actions = slice.actions;

export type SliceType = typeof actions;
