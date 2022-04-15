import * as React from 'react';

export enum EmptyStatesSize {
  SMALL = 'small',
  MEDIUM = 'medium',
}

export type EmptyStatesProps = {
  size?: EmptyStatesSize;
  fontSize?: EmptyStatesSize;
  title?: string | React.ReactNode;
  button?: string | React.ReactNode;
  content?: string | React.ReactNode;
  labelPosition?: 'bottom' | 'right';
  mode?: 'absolute';
  customIcon?: React.ReactElement;
};

export const IconSize = { [EmptyStatesSize.SMALL]: 48, [EmptyStatesSize.MEDIUM]: 96 };
export const FontSize = { [EmptyStatesSize.SMALL]: 14, [EmptyStatesSize.MEDIUM]: 18 };
