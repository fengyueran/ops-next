import { createSelector } from '@reduxjs/toolkit';

import { RootState } from 'src/store';

const selector = (state: RootState) => state.caseFilter;

const page = createSelector(selector, (root) => root.page);
const filters = createSelector(selector, (root) => root.filters);

export const selectors = {
  page,
  filters,
};
