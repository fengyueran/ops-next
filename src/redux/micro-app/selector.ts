import { createSelector } from '@reduxjs/toolkit';

import { RootState } from 'src/store';

const selector = (state: RootState) => state.microApp;

const microAppReady = createSelector(selector, (microApp) => microApp.microAppReady);

const submitPending = createSelector(selector, (microApp) => microApp.submitPending);

const microAppVisible = createSelector(selector, (microApp) => microApp.microAppVisible);
const canSubmit = createSelector(selector, (microApp) => microApp.canSubmit);
const canPatchSeg = createSelector(selector, (microApp) => microApp.canPatchSeg);

export const selectors = {
  canSubmit,
  microAppReady,
  canPatchSeg,
  submitPending,
  microAppVisible,
};
