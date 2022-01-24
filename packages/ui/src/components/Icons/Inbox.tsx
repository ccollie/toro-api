import React from 'react';
import { IconProps, BaseIcon } from './BaseIcon';

export const InboxIcon = (props: IconProps) => {
  const { color = 'currentColor', ...rest } = props;
  return (
    <BaseIcon {...rest} viewBox="0 0 21 21">
      <g fill="none" fillRule="evenodd" stroke={color} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.16 4.5h8.68a1 1 0 0 1 .92.606L18.5 11.5v4a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2v-4l2.74-6.394a1 1 0 0 1 .92-.606z" />
        <path d="M2.5 11.5h4a1 1 0 0 1 1 1v1a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h4" />
      </g>
    </BaseIcon>
  );
};
