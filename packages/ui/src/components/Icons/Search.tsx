import React from 'react';
import { IconProps, BaseIcon } from './BaseIcon';

export const SearchIcon = (props: IconProps) => {
  return (
    <BaseIcon
      viewBox="0 0 32 32"
      {...props}
    >
      <circle cx="14" cy="14" r="12" />
      <path d="M23 23 L30 30" />
    </BaseIcon>
  );
};
