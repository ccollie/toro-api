import React from 'react';
import { IconProps, BaseIcon } from './BaseIcon';

type TProps = IconProps & {
  isActive?: boolean;
}

export const AnalyticsIcon = (props: TProps) => {
  const { isActive = false, ...rest } = props;
  return (
    <BaseIcon viewBox="0 0 20 20" {...rest}>
      <svg className="shrink-0 h-6 w-6" viewBox="0 0 24 24">
        <path
          className={`fill-current text-gray-600 ${
            isActive && 'text-indigo-500'
          }`}
          d="M0 20h24v2H0z"
        />
        <path
          className={`fill-current text-gray-400 ${
            isActive && 'text-indigo-300'
          }`}
          d="M4 18h2a1 1 0 001-1V8a1 1 0 00-1-1H4a1 1 0 00-1 1v9a1 1 0 001 1zM11 18h2a1 1 0 001-1V3a1 1 0 00-1-1h-2a1 1 0 00-1 1v14a1 1 0 001 1zM17 12v5a1 1 0 001 1h2a1 1 0 001-1v-5a1 1 0 00-1-1h-2a1 1 0 00-1 1z"
        />
      </svg>
    </BaseIcon>
  );
};
