import { LoadingOverlay } from '@mantine/core';
import React from 'react';
import { ReactLocationDevtools } from 'react-location-devtools';
import Root from './Root';
import type { LocationGenerics } from '@/types';
import { useRouteBuilder } from './routes';
import { ReactLocation, Router } from 'react-location';

// Set up a ReactLocation instance
const location = new ReactLocation<LocationGenerics>();

export function App() {
  const routes = useRouteBuilder();
  return (
    <Router
      location={location}
      routes={routes}
      defaultPendingElement={
        <div className={`text-2xl`}>
          <LoadingOverlay visible={true} />
        </div>
      }>

      <Root />
      <ReactLocationDevtools position="bottom-right" />
    </Router>
  );
}


export default App;
