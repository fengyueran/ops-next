import { createSelector } from '@reduxjs/toolkit';

import { RootState } from 'src/store';

const selector = (state: RootState) => state.caseFilter;

const page = createSelector(selector, (root) => root.page);

export const selectors = {
  page,
};
