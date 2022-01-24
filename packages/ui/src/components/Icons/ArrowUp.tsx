import React from 'react';
import { BaseIcon, IconProps } from './BaseIcon';

export const ArrowUpIcon = (props: IconProps) => {
  const { color = 'currentColor', ...rest } = props;
  return (
    <BaseIcon {...rest} viewBox="0 0 24 24">
      <g fill="none">
        <path
          d="M12 20V4"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 11l7-7l7 7"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </BaseIcon>
  );
};
