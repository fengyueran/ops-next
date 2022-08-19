import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface State {
  selectedCaseID?: string;
}

const initialState: State = {};

export const slice = createSlice({
  name: 'CaseDetail',
  initialState,
  reducers: {
    setSelectCaseID(state, action: PayloadAction<string | undefined>) {
      state.selectedCaseID = action.payload;
    },
  },
});

export const actions = slice.actions;

export type SliceType = typeof actions;
