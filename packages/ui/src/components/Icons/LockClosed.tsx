import React from 'react';
import { IconProps, BaseIcon } from './BaseIcon';

export const LockClosedIcon = (props: IconProps) => {
  const { color = 'currentColor', ...rest } = props;
  return (
    <BaseIcon
      {...rest}
      viewBox="0 0 24 24"
      fill="none"
    >
      <g fill={color}>
        <path d="M3 13a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-6zm3-1a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H6z" />
        <path d="M7 7a5 5 0 0 1 10 0v4a1 1 0 1 1-2 0V7a3 3 0 1 0-6 0v4a1 1 0 1 1-2 0V7zm5 7a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1z" />
      </g>
    </BaseIcon>
  );
};