import { useMantineTheme } from '@mantine/core';
import { useMediaQuery as useQuery } from '@mantine/hooks';
import { Breakpoint } from 'src/types';

export const useBreakpointQuery = (breakpoint: Breakpoint) => {
  const theme = useMantineTheme();
  return useQuery(theme.fn.largerThan(breakpoint));
};
