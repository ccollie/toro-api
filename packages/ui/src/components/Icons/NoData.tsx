import React from 'react';
import { IconProps, BaseIcon } from './BaseIcon';

export const NoDataIcon = (props: IconProps) => {
  const { color = 'currentColor', ...rest } = props;
  return (
    <BaseIcon
         viewBox="0 0 24 24" {...rest}>
      <rect x="0" y="0" width="24" height="24" fill="none" stroke="none"/>
      <g className="icon-tabler" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"
         strokeLinejoin="round">
        <path
          d="M12.983 8.978C16.938 8.796 20 7.532 20 6c0-1.657-3.582-3-8-3c-1.661 0-3.204.19-4.483.515M4.734 4.743C4.263 5.125 4 5.551 4 6c0 1.22 1.944 2.271 4.734 2.74"/>
        <path d="M4 6v6c0 1.657 3.582 3 8 3c.986 0 1.93-.067 2.802-.19m3.187-.82C19.24 13.46 20 12.762 20 12V6"/>
        <path d="M4 12v6c0 1.657 3.582 3 8 3c3.217 0 5.991-.712 7.261-1.74M20 16v-4"/>
        <path d="M3 3l18 18"/>
      </g>
    </BaseIcon>
  )
}
