import React from 'react';
import styled from 'styled-components';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { persistStore } from 'redux-persist';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import { HashRouter } from 'react-router-dom';
import 'antd/dist/antd.min.css';

import { getLocale } from './locales';
import { store } from './store';
import { Routes } from './routes';
import { Token } from './views/token';
import { Error } from './views/global-error';
import { Loading } from './views/global-loading';

const Container = styled.div`
  width: 100vw;
  height: 100vh;
`;

let persistor = persistStore(store);

export const App = () => (
  <Provider store={store}>
    <IntlProvider locale="zh" messages={getLocale('zh')}>
      <ConfigProvider locale={zhCN}>
        <PersistGate persistor={persistor}>
          <Container>
            <HashRouter>
              <Token />
              <Routes />
            </HashRouter>
            <Loading />
            <Error />
          </Container>
        </PersistGate>
      </ConfigProvider>
    </IntlProvider>
  </Provider>
);
