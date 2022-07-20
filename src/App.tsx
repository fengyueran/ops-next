import React from 'react';
import styled from 'styled-components';
import { Routes, Route, HashRouter } from 'react-router-dom';
import 'antd/dist/antd.min.css';

import { IndexPage } from 'src/pages';

const Container = styled.div`
  width: 100vw;
  height: 100vh;
`;

export const App = () => (
  <Container>
    <HashRouter>
      <Routes>
        <Route path={'/'} element={<IndexPage />} />
      </Routes>
    </HashRouter>
  </Container>
);
