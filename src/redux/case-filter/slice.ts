import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface State {
  filter: object;
}

const initialState: State = {
  filter: {},
};

export const slice = createSlice({
  name: 'CaseFilter',
  initialState,
  reducers: {
    updateFilter(state, action: PayloadAction<boolean>) {},
  },
});

export const actions = slice.actions;

export type SliceType = typeof actions;
