import React from 'react';
import { BaseIcon, IconProps } from './BaseIcon';

export const AddIcon = (props: IconProps) => {
  const { color = 'currentColor', ...rest } = props;
  return (
    <BaseIcon {...rest} viewBox="0 0 1024 1024">
      <defs />
      <path d="M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z" fill={color} />
      <path d="M176 474h672q8 0 8 8v60q0 8-8 8H176q-8 0-8-8v-60q0-8 8-8z" fill={color} />
    </BaseIcon>
  );
};