import { createSelector } from '@reduxjs/toolkit';

import { RootState } from 'src/store';

const selector = (state: RootState) => state.cases;

const allCaseIDs = createSelector(selector, (root) => root.allCaseIDs);
const casesByID = createSelector(selector, (root) => root.casesByID);

const cases = createSelector(allCaseIDs, casesByID, (allCaseIDs, casesByID) => {
  return allCaseIDs.map((id) => casesByID[id]);
});

const pagination = createSelector(selector, (root) => root.pagination);
const openCaseID = createSelector(selector, (root) => root.openCaseID);

const getCaseByID = createSelector(
  casesByID,
  (state: RootState, id: string) => id,
  (casesByID, id) => {
    return casesByID[id];
  },
);

const getSelectedCase = createSelector(casesByID, openCaseID, (casesByID, id) => {
  if (id) return casesByID[id];
  return null;
});

export const selectors = {
  cases,
  openCaseID,
  pagination,
  getCaseByID,
  getSelectedCase,
};
