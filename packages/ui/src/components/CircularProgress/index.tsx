import React from 'react';
import { RingProgress, Text, MantineSize } from '@mantine/core';

export const CircularProgress = ({
  percentage,
  className,
  size = 95,
  thickness = 6,
  textSize = 'lg',
  showText = true,
  color = 'teal', // ?? primary ??
}: {
  percentage: number;
  className?: string;
  size?: number;
  thickness?: number;
  textSize?: MantineSize;
  showText?: boolean;
  color?: string;
}) => {
  return (
    <RingProgress
      size={size}
      thickness={thickness}
      className={className}
      sections={[{ value: percentage, color }]}
      label={
        showText && (
          <Text color={color} weight={700} align="center" size={textSize}>
            {percentage}%
          </Text>
        )
      }
    />
  );
};

export default CircularProgress;
