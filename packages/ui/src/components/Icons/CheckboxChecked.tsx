import React from 'react';
import { BaseIcon, IconProps } from './BaseIcon';

export const CheckboxCheckedIcon = (props: IconProps) => {
  return (
    <BaseIcon {...props}
      viewBox="0 0 24 24"
    >
      <path
        d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m0 2v14H5V5h14m-9 12l-4-4l1.41-1.42L10 14.17l6.59-6.59L18 9"
        fill="currentColor"
      />
    </BaseIcon>
  );
};