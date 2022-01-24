import React from 'react';
import type { Queue, QueueFragment } from '@/types';
import { getQueueStateColor, getQueueStateText } from '@/components/utils';
import { Badge, BadgeProps } from '@mantine/core';

type QueueStateBadgeProps = {
  className?: string;
  queue: Queue | QueueFragment;
  fullwidth?: boolean;
  radius?: BadgeProps<any>['radius'];
  size?: BadgeProps<any>['size'];
  variant?: BadgeProps<any>['variant'];
};

export const QueueStateBadge = (props : QueueStateBadgeProps) => {
  const { queue, variant = 'light', size = 'sm', ...rest } = props;
  const color = getQueueStateColor(queue);
  const state = getQueueStateText(queue);

  return (
    <Badge color={color} variant={variant} size={size} {...rest}>
      {state}
    </Badge>
  );
};

export default QueueStateBadge;
