import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

import { App } from './app';

window.SC_DISABLE_SPEEDY = true;

console.log('**********************VERSION**********************', process.env.REACT_APP_VERSION);
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
