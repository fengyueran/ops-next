import { createSelector } from '@reduxjs/toolkit';

import { RootState } from 'src/store';

const selector = (state: RootState) => state.other;

const loading = createSelector(selector, (other) => other.loading);

export const selectors = {
  loading,
};
