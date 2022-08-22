import React from 'react';
import styled from 'styled-components';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import { HashRouter } from 'react-router-dom';
import 'antd/dist/antd.min.css';

import { Loading } from './views/global-loading';
import { getLocale } from './locales';
import { store } from './store';
import { Routes } from './routes';

const Container = styled.div`
  width: 100vw;
  height: 100vh;
`;

export const App = () => (
  <Provider store={store}>
    <IntlProvider locale="zh" messages={getLocale('zh')}>
      <ConfigProvider locale={zhCN}>
        <Container>
          <HashRouter>
            <Routes />
          </HashRouter>
          <Loading />
        </Container>
      </ConfigProvider>
    </IntlProvider>
  </Provider>
);
