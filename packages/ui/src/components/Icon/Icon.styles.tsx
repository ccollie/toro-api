import { Box } from '@mantine/core';
import * as React from 'react';

export const defaultSize = 24;

type Props = {
  size?: string | number;
  color?: string;
  stroke?: boolean;
  onClick?: React.MouseEventHandler;
};

export const IconContainer: React.FC<Props> = (props) => {
  const { size, color, stroke, onClick, children, ...rest } = props;
  const sz = typeof size === 'string' ? parseInt(size, 10) : size;
  const sizeValue = `${sz || defaultSize}px`;
  return (
    <Box
      sx={{
          verticalAlign: 'middle',
          display: 'inline-block',
          width: sizeValue,
          height: sizeValue,
          color: 'inherit',
          svg: {
            display: 'block',
            fill: color,
            color: color,
            width: sizeValue,
            height: sizeValue,
            ...(onClick && { cursor: 'pointer' }),
            ...(stroke && { stroke: `${color}` }),
          }
        }}
      {...rest}
    >
      {children}
    </Box>
  );
};
