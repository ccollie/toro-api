import React from 'react';
import { IconProps, BaseIcon } from './BaseIcon';

export const ExportIcon = (props: IconProps) => {
  const { color = 'currentColor', ...rest } = props;
  return (
    <BaseIcon
      {...rest}
      viewBox="0 0 24 24"
    >
      <g strokeWidth="1.5" fill="none">
        <path
          d="M19 16v6m0 0l3-3m-3 3l-3-3"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 6v6s0 3 7 3s7-3 7-3V6"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 3c7 0 7 3 7 3s0 3-7 3s-7-3-7-3s0-3 7-3z"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 21c-7 0-7-3-7-3v-6"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </BaseIcon>
  );
};
