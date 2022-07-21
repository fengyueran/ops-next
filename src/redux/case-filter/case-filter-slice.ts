import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CaseFilterState {
  filter: object;
}

const initialState: CaseFilterState = {
  filter: {},
};

export const caseFilterSlice = createSlice({
  name: 'caseFilter',
  initialState,
  reducers: {
    updateFilter(state, action: PayloadAction<boolean>) {},
  },
});

export const actions = caseFilterSlice.actions;

export type caseFilterSliceType = typeof caseFilterSlice;
