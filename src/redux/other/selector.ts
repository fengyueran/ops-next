import { createSelector } from '@reduxjs/toolkit';

import { RootState } from 'src/store';

const selector = (state: RootState) => state.other;

const loading = createSelector(selector, (other) => other.loading);

const error = createSelector(selector, (other) => other.error);

export const selectors = {
  error,
  loading,
};
