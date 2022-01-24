import React from 'react';
import { BaseIcon, IconProps } from './BaseIcon';

export const CloseOutlinedIcon: React.FC<IconProps> = (props) => {
  const { children, ...rest } = props;
  const color = props.color || 'currentColor';
  return (
    <BaseIcon
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 24 24"
      {...rest}>
      <path
        fill={color}
        d="M13.41 12l4.3-4.29a1 1 0 1 0-1.42-1.42L12 10.59l-4.29-4.3a1 1 0 0 0-1.42 1.42l4.3 4.29l-4.3 4.29a1 1 0 0 0 0 1.42a1 1 0 0 0 1.42 0l4.29-4.3l4.29 4.3a1 1 0 0 0 1.42 0a1 1 0 0 0 0-1.42z"
      />
    </BaseIcon>
  );
};
