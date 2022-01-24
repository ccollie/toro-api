import { ColorScheme, ColorSchemeProvider, MantineProvider as Mantine } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { NotificationsProvider } from '@mantine/notifications';
import { useColorScheme } from '@mantine/hooks';

import React from 'react';
import { useThemeStore } from 'src/stores/theme';

const MantineProvider: React.FC = ({ children }) => {
  const setColorScheme = useThemeStore(x => x.setScheme);
  const colorScheme = useThemeStore(x => x.colorScheme);
  // hook will return either 'dark' or 'light' on client
  // and always 'light' during ssr as window.matchMedia is not available
  const preferredColorScheme = useColorScheme();
  setColorScheme(preferredColorScheme);
  const toggleColorScheme = (value?: ColorScheme) =>
    setColorScheme(value || (colorScheme === 'dark' ? 'light' : 'dark'));

  return (
    <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
      <Mantine>
        <ModalsProvider>
          <NotificationsProvider position="top-right">{children}</NotificationsProvider>
        </ModalsProvider>
      </Mantine>
    </ColorSchemeProvider>
  );
};

export default MantineProvider;
