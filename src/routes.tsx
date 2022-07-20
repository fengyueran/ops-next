import React from 'react';
import { Routes, Route } from 'react-router-dom';

import { IndexPage } from 'src/pages';

export const PageRoutes = () => {
  <Routes>
    <Route path={'/'} element={<IndexPage />} />
  </Routes>;
};
