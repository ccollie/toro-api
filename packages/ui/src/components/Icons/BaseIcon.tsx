import React, { CSSProperties } from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  color?: string;
  size?: string | number;
}
export const BaseIcon: React.FC<IconProps> = (props) => {
  const { children, color, size = 24, ...rest } = props;
  const style: CSSProperties = {};

  style.stroke = color ?? 'currentColor';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      className="icon"
      width={size}
      height={size}
      fill="none"
      focusable="false"
      role="img"
      style={style}
      {...rest}
    >
      {children}
    </svg>
  );
};
