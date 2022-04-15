import {
  ColorScheme,
  ColorSchemeProvider,
  MantineProvider as Mantine,
} from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { NotificationsProvider } from '@mantine/notifications';
import { useColorScheme } from '@mantine/hooks';

import React from 'react';
import { useThemeStore } from '@/stores/theme';

const MantineProvider: React.FC = ({ children }) => {
  const setColorScheme = useThemeStore((x) => x.setScheme);
  const colorScheme = useThemeStore((x) => x.colorScheme) ?? useColorScheme();

  const toggleColorScheme = (value?: ColorScheme) => {
    const newScheme = value || (colorScheme === 'light' ? 'dark' : 'light');
    setColorScheme(newScheme);
  };

  return (
    <ColorSchemeProvider
      colorScheme={colorScheme}
      toggleColorScheme={toggleColorScheme}
    >
      <Mantine>
        <ModalsProvider>
          <NotificationsProvider position="bottom-right">
            {children}
          </NotificationsProvider>
        </ModalsProvider>
      </Mantine>
    </ColorSchemeProvider>
  );
};

export default MantineProvider;
