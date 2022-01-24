import React from 'react';
import { BaseIcon, IconProps } from './BaseIcon';

export const ClipboardCopyIcon = (props: IconProps) => {
  const { color, ...rest } = props;
  const col = color || 'currentColor';
  return (
    <BaseIcon viewBox="0 0 24 24" {...rest}>
      <g fill="none">
        <path
          d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1M8 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M8 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 0h2a2 2 0 0 1 2 2v3m2 4H10m0 0l3-3m-3 3l3 3"
          stroke={col}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </BaseIcon>
  );
};
