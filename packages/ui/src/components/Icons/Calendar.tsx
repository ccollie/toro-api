import React from 'react';
import { IconProps, BaseIcon } from './BaseIcon';

export const CalendarIcon = (props: IconProps) => {
  const { color: col, ...rest } = props;
  const color = col || 'currentColor';
  return (
    <BaseIcon
      viewBox="0 0 24 24"
      {...rest}
    >
      <path
        d="M37 38H13c-1.7 0-3-1.3-3-3V13c0-1.7 1.1-3 2.5-3H14v2h-1.5c-.2 0-.5.4-.5 1v22c0 .6.4 1 1 1h24c.6 0 1-.4 1-1V13c0-.6-.3-1-.5-1H36v-2h1.5c1.4 0 2.5 1.3 2.5 3v22c0 1.7-1.3 3-3 3z"
        fill={color}
      />
      <path
        d="M17 14c-.6 0-1-.4-1-1V9c0-.6.4-1 1-1s1 .4 1 1v4c0 .6-.4 1-1 1z"
        fill={color}
      />
      <path
        d="M33 14c-.6 0-1-.4-1-1V9c0-.6.4-1 1-1s1 .4 1 1v4c0 .6-.4 1-1 1z"
        fill={color}
      />
      <path d="M20 10h10v2H20z" fill={color} />
      <path d="M12 16h26v2H12z" fill={color} />
      <path d="M34 20h2v2h-2z" fill={color} />
      <path d="M30 20h2v2h-2z" fill={color} />
      <path d="M26 20h2v2h-2z" fill={color} />
      <path d="M22 20h2v2h-2z" fill={color} />
      <path d="M18 20h2v2h-2z" fill={color} />
      <path d="M34 24h2v2h-2z" fill={color} />
      <path d="M30 24h2v2h-2z" fill={color} />
      <path d="M26 24h2v2h-2z" fill={color} />
      <path d="M22 24h2v2h-2z" fill={color} />
      <path d="M18 24h2v2h-2z" fill={color} />
      <path d="M14 24h2v2h-2z" fill={color} />
      <path d="M34 28h2v2h-2z" fill={color} />
      <path d="M30 28h2v2h-2z" fill={color} />
      <path d="M26 28h2v2h-2z" fill={color} />
      <path d="M22 28h2v2h-2z" fill={color} />
      <path d="M18 28h2v2h-2z" fill={color} />
      <path d="M14 28h2v2h-2z" fill={color} />
      <path d="M30 32h2v2h-2z" fill={color} />
      <path d="M26 32h2v2h-2z" fill={color} />
      <path d="M22 32h2v2h-2z" fill={color} />
      <path d="M18 32h2v2h-2z" fill={color} />
      <path d="M14 32h2v2h-2z" fill={color} />
    </BaseIcon>
  );
};
