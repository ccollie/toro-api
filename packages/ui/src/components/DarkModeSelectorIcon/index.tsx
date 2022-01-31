import React from 'react';
import { ActionIcon } from '@mantine/core';
import { SunIcon, MoonIcon } from '@radix-ui/react-icons';
import { useDarkMode } from '@/hooks/use-dark-mode';

interface DarkModeSelectorProps {
  size?: string | number;
}

export const DarkModeSelectorIcon = (props: DarkModeSelectorProps) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { size = 18 } = props;
  const style = { width: size, height: size };

  return (
    <ActionIcon
      variant="outline"
      color={isDarkMode ? 'yellow' : 'blue'}
      onClick={() => toggleDarkMode()}
      title="Toggle color scheme"
    >
      {isDarkMode ? <SunIcon style={style} /> : <MoonIcon style={style} />}
    </ActionIcon>
  );
};

export default DarkModeSelectorIcon;
