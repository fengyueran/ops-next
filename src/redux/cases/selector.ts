import { createSelector } from '@reduxjs/toolkit';

import { RootState } from 'src/store';

const selector = (state: RootState) => state.cases;

const allCaseIDs = createSelector(selector, (root) => root.allCaseIDs);
const casesByID = createSelector(selector, (root) => root.casesByID);

const cases = createSelector(allCaseIDs, casesByID, (allCaseIDs, casesByID) => {
  return allCaseIDs.map((id) => casesByID[id]);
});

const pagination = createSelector(selector, (root) => root.pagination);

const getCaseByID = createSelector(
  casesByID,
  (state: RootState, id: string) => id,
  (casesByID, id) => {
    return casesByID[id];
  },
);

export const selectors = {
  cases,
  pagination,
  getCaseByID,
};
