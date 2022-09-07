import React from 'react';

import { Routes as Rs, Route } from 'react-router-dom';

import { HomePage } from './pages/home';
import { LoginPage } from './pages/login';

export const RoutesMap = {
  ROOT: '/',
  LOGIN: '/login',
};

export const Routes = () => (
  <Rs>
    <Route path={RoutesMap.ROOT} element={<HomePage />} />
    <Route path={RoutesMap.LOGIN} element={<LoginPage />} />
  </Rs>
);
