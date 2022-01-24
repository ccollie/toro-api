import { Badge, BadgeProps } from '@mantine/core';
import React from 'react';
import type { JobStatus } from '@/types';
import { useJobStatusColor } from './hooks';

type TProps = {
  status: JobStatus;
  label?: string | number;
  className?: string;
  variant?: BadgeProps<any>['variant'];
  size?: BadgeProps<any>['size'];
};

export const JobStatusBadge: React.FC<TProps> = (props) => {
  const backgroundColor = useJobStatusColor(props.status);
  const content = props.label || props.status;
  return (
    <Badge
      style={{
        color: '#fff',
        backgroundColor,
      }}
      variant={props.variant}
      size={props.size}
      className={props.className}
    >{content}</Badge>
  );
}

