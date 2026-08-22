import React from 'react';
import ReactDOM from 'react-dom/client';
import { appRuntime, RuntimeApp } from './lib/runtime';

import './styles/index.css';

// Throwing here names the problem; `!` would defer it to a null-deref inside React.
const rootElement = document.querySelector('#root');
if (!rootElement) throw new Error('No #root element in index.html to mount into.');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RuntimeApp runtime={appRuntime} />
  </React.StrictMode>,
);
