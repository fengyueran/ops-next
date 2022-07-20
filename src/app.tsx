import React from 'react';
import styled from 'styled-components';
import { IntlProvider } from 'react-intl';
import { Routes, Route, HashRouter } from 'react-router-dom';
import 'antd/dist/antd.min.css';

import { IndexPage } from 'src/pages';
import { getLocale } from 'src/locales';

const Container = styled.div`
  width: 100vw;
  height: 100vh;
`;

export const App = () => (
  <IntlProvider locale="zh" messages={getLocale('zh')}>
    <Container>
      <HashRouter>
        <Routes>
          <Route path={'/'} element={<IndexPage />} />
        </Routes>
      </HashRouter>
    </Container>
  </IntlProvider>
);
