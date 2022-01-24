import { useThemeStore } from 'src/stores/theme';

export const useDarkMode = () => {
  const isDarkMode = useThemeStore(x => x.isDarkMode);
  const toggleDarkMode = useThemeStore(x => x.toggleDarkMode);

  return { isDarkMode, toggleDarkMode };
};
