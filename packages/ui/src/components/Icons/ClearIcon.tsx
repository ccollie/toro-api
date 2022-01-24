import React from 'react';
import { BaseIcon, IconProps } from './BaseIcon';

export const ClearIcon = (props: IconProps) => {
  const { color = 'currentColor', ...rest } = props;
  return (
    <BaseIcon
      {...rest}
      viewBox="0 0 24 24"
    >
      <path
        fill="none"
        stroke={color}
        strokeWidth="2"
        d="M10 4a2 2 0 1 1 4 0v6h6v4H4v-4h6V4zM4 14h16v8H4v-8zm12 8v-5.635M8 22v-5.635M12 22v-5.635"
      />
    </BaseIcon>
  );
};
