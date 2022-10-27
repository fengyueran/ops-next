import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const formatCase = (caseData: CaseData) => {
  const { id, attributes } = caseData;
  return { id, ...attributes };
};

//localDateStr只有年月日，如：2022-08-25
const convertLocalDateToTimestamp = (localDateStr: string) => {
  const date = new Date(`${localDateStr}T00:00:00`);
  return date.getTime();
};

const shouldAddCase = (caseData: CaseData, filters: Filters) => {
  const { caseID, PatientID, ffrAccessionNumber, dateRange, statusList, priorityList } = filters;

  let isAddCase = true;

  if (PatientID) {
    isAddCase = !!caseData.attributes.PatientID?.includes(PatientID);
  }
  if (caseID) {
    isAddCase = !!caseData.attributes.caseID?.includes(caseID);
  }

  if (ffrAccessionNumber) {
    isAddCase = !!caseData.attributes.ffrAccessionNumber?.includes(ffrAccessionNumber);
  }

  if (statusList) {
    isAddCase = statusList.includes(caseData.attributes.progress);
  }

  if (priorityList) {
    isAddCase = priorityList.includes(caseData.attributes.priority);
  }
  //本地时间
  if (dateRange) {
    const [start, end] = dateRange.map((dateStr) => convertLocalDateToTimestamp(dateStr));
    const oneDay = 3600 * 24 * 1000; //ms
    const uploadAt = new Date(caseData.attributes.uploadAt).getTime();
    isAddCase = uploadAt > start && uploadAt <= end + oneDay;
  }

  return isAddCase;
};

interface Pagination {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}

export interface State {
  casesByID: { [key: string]: CaseInfo & { id: string } };
  allCaseIDs: string[];
  pagination?: Pagination;
  openCaseID?: string;
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
      const casesByID: { [key: string]: CaseInfo & { id: string } } = {};
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
    addCase(state, action: PayloadAction<{ caseData: CaseData; filters: Filters }>) {
      const { caseData, filters } = action.payload;
      if (!shouldAddCase(caseData, filters)) return;

      const { id } = caseData;
      const hasCase = state.casesByID[id];
      const formatted = formatCase(caseData);

      if (!hasCase) {
        state.casesByID[id] = formatted;
        const allCaseIDs = [...state.allCaseIDs];

        if (state.pagination) {
          const { total, pageSize } = state.pagination;
          if (allCaseIDs.length === pageSize) {
            allCaseIDs.pop();
          }
          state.allCaseIDs = [id, ...allCaseIDs];
          state.casesByID = { ...state.casesByID };

          const newTotal = total + 1;
          const newPageCount = (newTotal % pageSize) + 1;
          state.pagination = { ...state.pagination, total: newTotal, pageCount: newPageCount };
        }
      }
    },
    setOpenCaseID(state, action: PayloadAction<string | undefined>) {
      state.openCaseID = action.payload;
    },
  },
});

export const actions = slice.actions;

export type SliceType = typeof actions;
