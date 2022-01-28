import { MantineTheme as Theme, createStyles } from '@mantine/core';

export const useHeaderCheckboxStyles = createStyles((theme: Theme) => ({root: {
    fontSize: 16,
    margin: '-8px 0 -8px -15px',
    padding: '8px 9px',
    '& svg': {
      width: '24px',
      height: '24px',
    },
    '&:hover': {
      backgroundColor: 'transparent',
    },
  }})
);

export const useRowCheckboxStyles = createStyles((theme: Theme) => ({root: {
    fontSize: '14px',
    margin: '-9px 0 -8px -15px',
    padding: '5px 9px',
    '&:hover': {
      backgroundColor: 'transparent',
    },
    '& svg': {
      width: 24,
      height: 24,
    },
  }}),
);
