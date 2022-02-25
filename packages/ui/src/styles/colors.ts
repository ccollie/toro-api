// todo: theme ????
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
  | 'subdued'
  | 'accent'
  | 'light'
  | 'dark';

const StatusColorMap: Record<StatusColor, BasicColor | string> = {
  primary: 'indigo',
  secondary: 'orange',
  success: 'green',
  warning: 'yellow',
  info: 'blue',
  danger: 'red',
  light: 'indigo',
  dark: 'gray',
  accent: '#f04e98',
  subdued: '#69707d',
};

export function mapColor(color: BasicColor | StatusColor): BasicColor {
  return (StatusColorMap as any)[color] ?? color;
}
