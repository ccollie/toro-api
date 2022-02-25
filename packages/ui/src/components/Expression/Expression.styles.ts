import { createStyles, MantineSize } from '@mantine/styles';

interface AutocompleteStyles {
  size: MantineSize;
  isUpperCase?: boolean;
  isActive?: boolean;
}

export default createStyles(
  (theme, { size, isUpperCase }: AutocompleteStyles) => {
    const spacing = theme.fn.size({ size, sizes: theme.spacing });
    const xsSpacing = theme.fn.size({ size: 'xs', sizes: theme.spacing });
    const smSpacing = theme.fn.size({ size: 'sm', sizes: theme.spacing });

    return {
      expression: {
        borderBottom: '2px solid transparent',
        display: 'inline-block' /* 1 */,
        textAlign: 'left',
        padding: `(${xsSpacing} / 2) 0`,
        transition: 'all $euiAnimSpeedNormal ease-in-out',
        color:
          theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
        '&:focus': {
          borderBottomStyle: 'solid',
        },

        '& + .expression': {
          marginLeft: `${smSpacing}`,
        },

        '&.expression--columns': {
          borderColor: 'transparent',
          // Ensures there's no flash of the dashed style before turning solid for the active state
          borderBottomStyle: 'solid',
          marginBottom: `${xsSpacing}`,
        },

        '&.expression--truncate': {
          maxWidth: '100%',
          'expression__description, expression__value': {
            maxWidth: '100%',
            overflowHidden: '!important',
            textOverflow: 'ellipsis !important',
            whiteSpace: 'nowrap !important',
            wordWrap: 'normal !important', // 2
            display: 'inline-block',
            verticalAlign: 'bottom',
          },
        },
        isActive: {
          borderBottomStyle: 'solid',
        },
      },

      'expression-isUpperCase expression__description': {
        textTransform: 'uppercase',
      },
      description: {
        textAlign: 'right',
        marginRight: '$euiSizeS;',
        flexShrink: 0, // Ensures it doesn't get smaller in case the value is really long
      },

      icon: {
        marginLeft: xsSpacing,
      },

      value: {
        flexGrow: 1,
      },

      item: {
        textAlign: 'left',
        width: '100%',
        padding: `${spacing / 1.5}px ${spacing}`,
        fontSize: theme.fn.size({ size, sizes: theme.fontSizes }),
        color:
          theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
      },

      hovered: {
        backgroundColor:
          theme.colorScheme === 'dark'
            ? theme.colors.dark[4]
            : theme.colors.gray[1],
      },

      nothingFound: {
        boxSizing: 'border-box',
        color: theme.colors.gray[6],
        paddingTop: spacing / 2,
        paddingBottom: spacing / 2,
        textAlign: 'center',
      },
    };
  },
);
