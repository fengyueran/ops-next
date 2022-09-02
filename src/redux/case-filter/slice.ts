import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Pagination {
  page: number;
  pageSize: number;
}
export interface State {
  filters: {
    PatientID?: string;
    ffrAccessionNumber?: string;
    dateRange?: [string, string];
    statusList?: CaseStatus[];
    priorityList?: Priority[];
  };
  pagination: Pagination;
  sort?: string;
}

const initialState: State = {
  filters: {},
  pagination: {
    page: 0,
    pageSize: 30,
  },
};

export const slice = createSlice({
  name: 'CaseFilter',
  initialState,
  reducers: {
    updateFilter(state, action: PayloadAction<object>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination(state, action: PayloadAction<Pagination>) {
      state.pagination = action.payload;
    },
    setSort(state, action: PayloadAction<string | undefined>) {
      state.sort = action.payload;
    },
  },
});

export const actions = slice.actions;

export type SliceType = typeof actions;
