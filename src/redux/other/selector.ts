import { createSelector } from '@reduxjs/toolkit';

import { RootState } from 'src/store';

export const otherSelector = (state: RootState) => state.other;

export const microAppVisibleSelector = createSelector(
  otherSelector,
  (other) => other.microAppVisible,
);

export const selectors = {
  microAppVisibleSelector,
};
