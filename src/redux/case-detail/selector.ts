import { createSelector } from '@reduxjs/toolkit';

import { RootState } from 'src/store';

const selector = (state: RootState) => state.caseDetail;

const loading = createSelector(selector, (root) => root.loading);

export const selectors = {
  loading,
};
