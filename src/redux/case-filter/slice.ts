import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface State {
  filter: object;
  page: number;
}

const initialState: State = {
  filter: {},
  page: 0,
};

export const slice = createSlice({
  name: 'CaseFilter',
  initialState,
  reducers: {
    updateFilter(state, action: PayloadAction<boolean>) {},
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
  },
});

export const actions = slice.actions;

export type SliceType = typeof actions;
