import React from 'react';
import type { Status } from '@/types';
import { RingProgress, Text, MantineSize } from '@mantine/core';

export const Progress = ({
  percentage,
  status,
  className,
  size = 95,
  thickness = 6,
  textSize = 'lg',
  showText = true
}: {
  percentage: number;
  status: Status;
  className?: string;
  size?: number;
  thickness?: number;
  textSize?: MantineSize;
  showText?: boolean;
}) => {
  const color = status === 'failed' ? '#F56565' : 'teal';
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
