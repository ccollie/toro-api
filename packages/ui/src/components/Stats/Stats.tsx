import React, { ReactNode } from 'react';
import s from './stats.module.css';
import cn from 'clsx';

type StatsPart = 'container' | 'item' | 'title' | 'value' | 'description' | 'figure';

function getClassName(part: StatsPart, className?: string) {
  let base = '';
  switch (part) {
    case 'container':
      base = s.stats;
      break;
    case 'item':
      base = s.stat;
      break;
    case 'title':
      base = s.statTitle;
      break;
    case 'value':
      base = s.statValue;
      break;
    case 'description':
      base = s.statDesc;
      break;
    case 'figure':
      base = s.statFigure;
      break;
    default:
      return className;
  }
  return cn(base, className);
}

interface StatsPartProps extends React.HTMLAttributes<HTMLDivElement> {
  part: StatsPart;
}

const StatsPart: React.FC<StatsPartProps> = ( props ) => {
  const { part, className, children, ...rest } = props;
  return (
    <div className={getClassName(part, className)} {...rest}>{children}</div>
  );
};

interface StatsGroupProps extends React.HTMLAttributes<HTMLDivElement> {
}

export const StatisticsGroup: React.FC<StatsGroupProps> = (props) => {
  const { children, className,...rest } = props;
  return (
    <div className={cn(s.stats, className)} {...rest}>
      {children}
    </div>
  );
};

interface StatsTitleProps extends React.HTMLAttributes<HTMLDivElement> {
}

export const StatsTitle: React.FC<StatsTitleProps> = (props) => {
  const { children, ...rest } = props;
  return (
    <div className={s.statTitle} {...rest}>
      {children}
    </div>
  );
};

interface StatsFigureProps extends React.HTMLAttributes<HTMLDivElement> {
}

export const StatsFigure: React.FC<StatsFigureProps> = (props) => {
  const { children, ...rest } = props;
  return (
    <div className={s.statFigure} {...rest}>
      {children}
    </div>
  );
};

export interface StatProps {
  className?: string;
  title?: ReactNode;
  value?: ReactNode;
  description?: ReactNode;
  figure?: ReactNode;
}

export const Statistic: React.FC<StatProps> = (props) => {
  const { children, title, value, description, figure, ...rest } = props;
  const style = { gridTemplateColumns: '1fr auto' };
  return (
    <div className={s.stat} {...rest} style={style}>
      {title && <div className={s.statTitle}>{title}</div>}
      {value && <div className={s.statValue}>{value}</div>}
      {description && <div className={s.statDesc}>{description}</div>}
      {figure && <div className={s.statFigure}>{figure}</div>}
      {children && {children}}
    </div>
  );
};

