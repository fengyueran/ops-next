import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface State {
  microAppReady: boolean;
  submitPending: boolean;
  microAppVisible: boolean;
}

const initialState: State = {
  microAppReady: false,
  submitPending: false,
  microAppVisible: false,
};

export const slice = createSlice({
  name: 'MicroApp',
  initialState,
  reducers: {
    toggleMicroAppReady(state, action: PayloadAction<boolean>) {
      state.microAppReady = action.payload;
    },
    toggleMicroAppVisible(state, action: PayloadAction<boolean>) {
      state.microAppVisible = action.payload;
      if (state.microAppVisible) {
        state.microAppReady = false;
      } else {
        state.submitPending = false;
      }
    },
    toggleSubmitPending(state, action: PayloadAction<boolean>) {
      state.submitPending = action.payload;
    },
  },
});

export const actions = slice.actions;

export type SliceType = typeof actions;
