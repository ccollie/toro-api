import { Center } from '@mantine/core';
import React, { ReactNode } from 'react';
import s from './EmptyState.module.css';

interface EmptyStateProps {
  className?: string;
  title?: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = (props) => {
  const { className, title, subtitle, actions, icon, children } = props;
  return (
    <Center className={`${s.empty} ${className}`}>
      {icon && <div className={`${s.emptyIcon}`}>{icon}</div>}
      {title && <p className={`${s.emptyTitle} h5`}>{title}</p>}
      {subtitle && <p className={`${s.emptySubtitle}`}>{subtitle}</p>}
      {children && <div className={`${s.emptyChildren}`}>{children}</div>}
      {actions && <div className={`${s.emptyAction}`}>{actions}</div>}
    </Center>
  );
};

export default EmptyState;
