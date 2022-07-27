import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OtherState {
  microAppVisible: boolean;
}

const initialState: OtherState = {
  microAppVisible: false,
};

export const otherSlice = createSlice({
  name: 'other',
  initialState,
  reducers: {
    toggleMicroAppVisible(state, action: PayloadAction<boolean>) {
      state.microAppVisible = action.payload;
    },
  },
});

export const otherActions = otherSlice.actions;

export type otherSliceType = typeof otherSlice;
