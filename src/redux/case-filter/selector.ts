import { createSelector } from '@reduxjs/toolkit';

import { RootState } from 'src/store';

const caseFilter = (state: RootState) => state.caseFilter;

const pagination = createSelector(caseFilter, (root) => root.pagination);
const filters = createSelector(caseFilter, (root) => root.filters);

export const selectors = {
  caseFilter,
  pagination,
  filters,
};
