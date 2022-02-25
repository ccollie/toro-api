import { useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useRef } from 'react';
import { Breakpoint } from '@/types';

const BreakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];

export const useMatchedBreakpoints = (): Record<Breakpoint, boolean> => {
  const theme = useMantineTheme();

  const breakpointMatched = useRef<Record<Breakpoint, boolean>>({
    xs: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
  });

  BreakpointOrder.forEach(breakpoint =>
    breakpointMatched.current[breakpoint] = useMediaQuery(theme.fn.largerThan(breakpoint)));

  return breakpointMatched.current;
};
