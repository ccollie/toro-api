import React from 'react';
import { render } from 'react-dom';

import '@unocss/reset/tailwind.css';
import 'uno:icons.css';
import 'uno.css';
import './styles/index.css';
import './styles/theme.css';
import './styles/animations.css';
import './styles/statistics.css';

import ApolloProvider from './providers/ApolloProvider';
import MantineProvider from './providers/MantineProvider';
import { App } from './components/App';

// const basePath = ((window as any).__basePath__ =
//   document.head.querySelector('base')?.getAttribute('href') || '');

render(
  <ApolloProvider>
    <MantineProvider>
      <App />
    </MantineProvider>
  </ApolloProvider>,
  document.getElementById('root')
);
