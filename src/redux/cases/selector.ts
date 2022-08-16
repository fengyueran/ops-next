import { createSelector } from '@reduxjs/toolkit';

import { RootState } from 'src/store';

const selector = (state: RootState) => state.cases;

const allCaseIDsSelector = createSelector(selector, (root) => root.allCaseIDs);
const casesByIDSelector = createSelector(selector, (root) => root.casesByID);

const casesSelector = createSelector(
  allCaseIDsSelector,
  casesByIDSelector,
  (allCaseIDs, casesByID) => {
    return allCaseIDs.map((id) => casesByID[id]);
  },
);

const paginationSelector = createSelector(selector, (root) => root.pagination);

export const selectors = {
  casesSelector,
  paginationSelector,
};
