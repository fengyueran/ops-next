import { createSelector } from '@reduxjs/toolkit';

import { RootState } from 'src/store';

const selector = (state: RootState) => state.microApp;

const microAppReady = createSelector(selector, (microApp) => microApp.microAppReady);

const submitPending = createSelector(selector, (microApp) => microApp.submitPending);
const gotoSegLoading = createSelector(selector, (microApp) => microApp.gotoSegLoading);
const microAppVisible = createSelector(selector, (microApp) => microApp.microAppVisible);
const canSubmit = createSelector(selector, (microApp) => microApp.canSubmit);
const canGotoSeg = createSelector(selector, (microApp) => microApp.canGotoSeg);
const currentOperation = createSelector(selector, (microApp) => microApp.currentOperation);

export const selectors = {
  canSubmit,
  microAppReady,
  canGotoSeg,
  submitPending,
  microAppVisible,
  gotoSegLoading,
  currentOperation,
};
