import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface State {
  filters: {
    PatientID?: string;
    ffrAccessionNumber?: string;
    dateRange?: [string, string];
    statusList?: CaseStatus[];
    priorityList?: Priority[];
  };
  page: number;
}

const initialState: State = {
  filters: {},
  page: 0,
};

export const slice = createSlice({
  name: 'CaseFilter',
  initialState,
  reducers: {
    updateFilter(state, action: PayloadAction<object>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
  },
});

export const actions = slice.actions;

export type SliceType = typeof actions;
