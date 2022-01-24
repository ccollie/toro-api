// todo: theme ????

export type ElementSize = 'sm' | 'md' | 'lg' | 'xs' | 'xl';
export type BasicColor =
  | 'blue'
  | 'green'
  | 'red'
  | 'yellow'
  | 'indigo'
  | 'violet'
  | 'orange'
  | 'cyan'
  | 'teal'
  | 'pink'
  | 'purple'
  | 'gray';

export type StatusColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'light'
  | 'dark';

const StatusColorMap: Record<StatusColor, BasicColor> = {
  primary: 'indigo',
  secondary: 'orange',
  success: 'green',
  info: 'blue',
  warning: 'yellow',
  danger: 'red',
  light: 'indigo',
  dark: 'gray',
};

export function mapColor(color: BasicColor | StatusColor): BasicColor {
  return (StatusColorMap as any)[color] ?? color;
}
