import { createSelector } from '@reduxjs/toolkit';

import { RootState } from 'src/store';

const selector = (state: RootState) => state.microApp;

const microAppReadySelector = createSelector(selector, (microApp) => microApp.microAppReady);

const submitPendingSelector = createSelector(selector, (microApp) => microApp.submitPending);

export const microAppVisibleSelector = createSelector(
  selector,
  (microApp) => microApp.microAppVisible,
);

export const selectors = {
  microAppReadySelector,
  submitPendingSelector,
  microAppVisibleSelector,
};
