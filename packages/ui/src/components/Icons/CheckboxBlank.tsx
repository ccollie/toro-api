import React from 'react';
import { BaseIcon, IconProps } from './BaseIcon';

export const CheckboxBlankIcon = (props: IconProps) => {
  return (
    <BaseIcon
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        d="M19 3H5c-1.11 0-2 .89-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m0 2v14H5V5h14z"
        fill="currentColor"
      />
    </BaseIcon>
  );
};