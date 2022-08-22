import React from 'react';

import { Routes as Rs, Route } from 'react-router-dom';

import { CaseListPage } from './pages/case-list';
import { LoginPage } from './pages/login';

export const RoutesMap = {
  ROOT: '/',
  LOGIN: '/login',
  CASE_LIST: '/caselist',
};

export const Routes = () => (
  <Rs>
    <Route path={RoutesMap.ROOT} element={<LoginPage />} />
    <Route path={RoutesMap.LOGIN} element={<LoginPage />} />
    <Route path={RoutesMap.CASE_LIST} element={<CaseListPage />} />
  </Rs>
);
