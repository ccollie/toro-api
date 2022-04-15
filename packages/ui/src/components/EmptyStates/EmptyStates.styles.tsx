import { Box } from '@mantine/core';
import React from 'react';
import { EmptyStatesSize, FontSize } from './EmptyStates.types';

const FONT_SIZE_DEFAULT = 14;
const mapElementsPosition = {
  right: 'row',
  bottom: 'column',
};

export const StatusIconContainer: React.FC = (props) => {
  const { children, ...rest } = props;
  return (
    <Box
      styles={{
        width: '40px',
        height: '40px',
        borderRadius: '20px',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
      }}
      {...rest}
    >
      {children}
    </Box>
  );
};

interface TextWrapperProps {
  labelPosition: 'right' | 'bottom';
}

export const TextWrapper: React.FC<TextWrapperProps> = (props) => {
  const { labelPosition, children } = props;
  return (
    <Box
      sx={{
        display: 'flex',
        lineHeight: '16px',
        maxWidth: '440px',
        wordWrap: 'break-word',
        textAlign: 'center',
        paddingBottom: '8px',
        justifyContent: labelPosition === 'bottom' ? 'center' : 'flex-start',
      }}
    >
      {children}
    </Box>
  );
};

interface HeaderWrapperProps {
  fontSize?: EmptyStatesSize;
  size?: EmptyStatesSize;
}

export const HeaderWrapper: React.FC<HeaderWrapperProps> = (props) => {
  const { fontSize, size, children } = props;
  const fontSizeValue =
    (fontSize ? FontSize[fontSize] : FONT_SIZE_DEFAULT) || FONT_SIZE_DEFAULT;
  const sizeValue = size || FONT_SIZE_DEFAULT;
  const paddingValue = fontSize === EmptyStatesSize.SMALL ? '12px' : '18px';
  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        lineHeight: '16px',
        fontSize: `${fontSizeValue}px`,
        fontWeight: 500,
        color: theme.colors.gray[6],
        paddingBottom: paddingValue,
      })}
    >
      {children}
    </Box>
  );
};

export const ButtonWrapper: React.FC = (props) => {
  const { children, ...rest } = props;
  return (
    <Box
      sx={{
        display: 'flex',
        paddingTop: '12px',
      }}
      {...rest}
    >
      {children}
    </Box>
  );
};

interface EmptyStateWrapperProps {
  size?: EmptyStatesSize;
  labelPosition?: 'bottom' | 'right';
  mode?: 'absolute';
  className?: string;
}

export const EmptyStatesWrapper: React.FC<EmptyStateWrapperProps> = (props) => {
  const { labelPosition, mode, children, ...rest } = props;
  const direction = labelPosition
    ? mapElementsPosition[labelPosition]
    : undefined;
  return (
    <Box
      styles={{
        ...(direction && { flexDirection: direction }),
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...(mode === 'absolute' && {
          position: 'absolute',
          top: '50%',
          left: '50%',
        }),
      }}
      {...rest}
    >
      {children}
    </Box>
  );
};

interface EmptyStatesIconContainerProps {
  size?: EmptyStatesSize;
}
export const EmptyStatesIconContainer: React.FC<
  EmptyStatesIconContainerProps
> = (props) => {
  const { size, children } = props;
  return (
    <Box
      sx={{
        marginBottom: size === EmptyStatesSize.SMALL ? '8px' : '40px',
      }}
    >
      {children}
    </Box>
  );
};
