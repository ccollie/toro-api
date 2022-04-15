import React, { useEffect, useState } from 'react';
import { ActionIcon, useMantineColorScheme } from '@mantine/core';
import { SunIcon, MoonIcon } from '@radix-ui/react-icons';

interface DarkModeSelectorProps {
  size?: string | number;
}

export const DarkModeSelectorIcon = (props: DarkModeSelectorProps) => {
  const { size = 18 } = props;
  const style = { width: size, height: size };
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');

  useEffect( () =>{
    setIsDarkMode(colorScheme === 'dark');
  }, [colorScheme]);

  return (
    <ActionIcon
      variant="outline"
      color={isDarkMode ? 'yellow' : 'blue'}
      onClick={() => toggleColorScheme()}
      title="Toggle color scheme"
    >
      {isDarkMode ? <SunIcon style={style} /> : <MoonIcon style={style} />}
    </ActionIcon>
  );
};

export default DarkModeSelectorIcon;
