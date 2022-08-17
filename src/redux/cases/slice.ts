import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const formatCase = (caseData: CaseData) => {
  const { id, attributes } = caseData;
  return { id, ...attributes };
};

interface Pagination {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}

export interface State {
  casesByID: { [key: string]: CaseInfo };
  allCaseIDs: string[];
  pagination?: Pagination;
}

const initialState: State = {
  casesByID: {},
  allCaseIDs: [],
};

export const slice = createSlice({
  name: 'cases',
  initialState,
  reducers: {
    addCases(state, action: PayloadAction<CaseFetchResponse>) {
      const { data, meta } = action.payload;

      const casesByID: { [key: string]: CaseInfo } = {};
      const allCaseIDs: string[] = [];
      data.forEach((doc) => {
        const formatted = formatCase(doc);
        const { id } = formatted;
        casesByID[id] = formatted;
        allCaseIDs.push(id);
      });
      state.casesByID = casesByID;
      state.allCaseIDs = allCaseIDs;
      state.pagination = meta.pagination;
    },
    updateCase(state, action: PayloadAction<CaseData>) {
      const { id } = action.payload;
      const hasCase = state.casesByID[id];

      if (hasCase) {
        const formatted = formatCase(action.payload);
        state.casesByID[id] = formatted;
      }

      state.allCaseIDs = [...state.allCaseIDs];
      state.casesByID = { ...state.casesByID };
    },
  },
});

export const actions = slice.actions;

export type SliceType = typeof actions;
