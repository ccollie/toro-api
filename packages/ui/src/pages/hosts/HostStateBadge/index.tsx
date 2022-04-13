import React from 'react';
import type { QueueHost } from '@/types';
import { StatusColor } from '@/styles/colors';
import { Badge, BadgeProps } from '@mantine/core';

type HostStateBadgeProps = {
  host: QueueHost;
  fullwidth?: boolean;
  radius?: BadgeProps<any>['radius'];
  size?: BadgeProps<any>['size'];
  variant?: BadgeProps<any>['variant'];
};

export const HostStateBadge: React.FC<HostStateBadgeProps> = (props) => {
  const { host, size = 'sm', variant = 'light', ...rest } = props;
  // todo: from theme
  let color = 'blue';
  let state = 'Active';
  // HACK: !!!
  const count =
    host.workerCount +
    (host.queues ?? []).reduce((acc, q) => acc + q.workerCount, 0);
  if (!count) {
    color = 'red';
    state = 'Inactive';
  }
  return (
    <Badge color={color as StatusColor} size={size} variant={variant} {...rest}>
      {state}
    </Badge>
  );
};

export default HostStateBadge;
