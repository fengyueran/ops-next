import { createSelector } from '@reduxjs/toolkit';

import { RootState } from 'src/store';

const selector = (state: RootState) => state.caseDetail;

const selectedCaseID = createSelector(selector, (root) => root.selectedCaseID);

export const selectors = {
  selectedCaseID,
};
