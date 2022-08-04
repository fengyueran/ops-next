import React from 'react';
import styled from 'styled-components';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { Routes, Route, HashRouter } from 'react-router-dom';
import 'antd/dist/antd.min.css';

import { IndexPage } from './pages';
import { getLocale } from './locales';
import { store } from './store';

const Container = styled.div`
  width: 100vw;
  height: 100vh;
`;

export const App = () => (
  <Provider store={store}>
    <IntlProvider locale="zh" messages={getLocale('zh')}>
      <Container>
        <HashRouter>
          <Routes>
            <Route path={'/'} element={<IndexPage />} />
          </Routes>
        </HashRouter>
      </Container>
    </IntlProvider>
  </Provider>
);