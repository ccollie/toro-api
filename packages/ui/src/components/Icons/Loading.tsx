import React from 'react';
import { IconProps, BaseIcon } from './BaseIcon';

export const LoadingIcon = (props: IconProps) => {
  const { color = 'currentColor', ...rest } = props;
  return (
    <BaseIcon
      {...rest}
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
    >
      <path
        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8z"
        opacity=".5"
        fill={color}
      />
      <path d="M20 12h2A10 10 0 0 0 12 2v2a8 8 0 0 1 8 8z" fill={color}>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="1s"
          repeatCount="indefinite"
        />
      </path>
    </BaseIcon>
  );
};
