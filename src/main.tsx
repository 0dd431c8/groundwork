import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { Provider } from 'jotai';
import { router } from './lib/router';
import { queryClient } from './lib/query-client';
import { store } from './lib/store';

import './styles/index.css';

// `!` is banned, and it would only have converted a missing #root into a confusing
// null-deref inside React. Failing here names the actual problem: index.html changed.
const rootElement = document.querySelector('#root');
if (!rootElement) throw new Error('No #root element in index.html to mount into.');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </QueryClientProvider>
  </React.StrictMode>,
);
