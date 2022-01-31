import { ColorScheme, useMantineColorScheme } from '@mantine/core';
import { useThemeStore } from 'src/stores/theme';
import shallow from 'zustand/shallow';

export const useDarkMode = () => {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [colorSchemeInStore, setScheme, toggleInStore, isDarkMode] = useThemeStore(
    (x) => [x.colorScheme, x.setScheme, x.toggleDarkMode, x.isDarkMode],
    shallow,
  );

  // sync state. hackish
  if (colorScheme !== colorSchemeInStore) {
    toggleColorScheme(colorScheme);
  }

  const toggleDarkMode = (scheme?: ColorScheme) => {
    toggleColorScheme(scheme);
    if (!scheme) {
      toggleInStore();
    } else {
      setScheme(scheme);
    }
  };

  return { isDarkMode, toggleDarkMode };
};
