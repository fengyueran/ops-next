import { createSelector } from '@reduxjs/toolkit';

import { RootState } from 'src/store';

const selector = (state: RootState) => state.user;

const token = createSelector(selector, (user) => user.token);

const user = createSelector(selector, (user) => user.user);

const loginInfo = createSelector(selector, (user) => user.loginInfo);

export const selectors = {
  token,
  user,
  loginInfo,
};
