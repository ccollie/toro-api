import React from 'react';
import { BaseIcon, IconProps } from './BaseIcon';

export const IdCardLightIcon = (props: IconProps) => {
  const { color = 'currentColor', ...rest } = props;
  return (
    <BaseIcon {...rest} viewBox="0 0 256 256">
      <path
        d="M198 112a6 6 0 0 1-6 6h-40a6 6 0 0 1 0-12h40a6 6 0 0 1 6 6zm-6 26h-40a6 6 0 0 0 0 12h40a6 6 0 0 0 0-12zm-63.1 28.5a6 6 0 0 1-11.6 3a26 26 0 0 0-50.4 0a6 6 0 0 1-5.8 4.5l-1.5-.2a6 6 0 0 1-4.3-7.3A38 38 0 0 1 73 143.1a30 30 0 1 1 38.2 0a38 38 0 0 1 17.7 23.4zM92.1 138a18 18 0 1 0-18-18a18.1 18.1 0 0 0 18 18zM230 56v144a14 14 0 0 1-14 14H40a14 14 0 0 1-14-14V56a14 14 0 0 1 14-14h176a14 14 0 0 1 14 14zm-12 0a2 2 0 0 0-2-2H40a2 2 0 0 0-2 2v144a2 2 0 0 0 2 2h176a2 2 0 0 0 2-2z"
        fill={color}
      />
    </BaseIcon>
  );
};
