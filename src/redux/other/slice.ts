import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface State {
  loading: boolean;
}

const initialState: State = {
  loading: false,
};

export const slice = createSlice({
  name: 'Other',
  initialState,
  reducers: {
    toggleLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const actions = slice.actions;

export type SliceType = typeof actions;
