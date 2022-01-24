import type { Queue } from '@/types';
import React, { useCallback } from 'react';
import {
  EllipsisVerticalIcon,
  HideIcon,
  LockClosedIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
} from '@/components/Icons';
import { useWhyDidYouUpdate } from '@/hooks';
import { useQueueActions } from '@/services';
import { Menu, ActionIcon } from '@mantine/core';

type QueueMenuProps = {
  queue: Queue;
};

export const QueueMenu: React.FC<QueueMenuProps> = (props) => {
  const { queue } = props;
  const actions = useQueueActions(queue.id);

  // TODO: restrict 'Drain' to delayed/waiting

  useWhyDidYouUpdate('QueueMenu', props);

  const handleDelete = useCallback(() => {
    actions.delete().catch(console.error);
  }, [actions]);

  return (
    <Menu
      withArrow
      aria-label="Queue Menu"
      trigger="hover"
      control={
        <ActionIcon>
          {queue.isReadonly ? (
            <LockClosedIcon />
          ) : (
            <EllipsisVerticalIcon style={{ cursor: 'pointer' }} />
          )}
        </ActionIcon>
      }
    >
      <Menu.Label>Queue Actions</Menu.Label>
      {queue.isPaused ? (
        <Menu.Item onClick={actions.resume} icon={<PauseIcon />}>
          Resume
        </Menu.Item>
      ) : (
        <Menu.Item onClick={actions.pause} icon={<PlayIcon />}>
          Pause
        </Menu.Item>
      )}
      <Menu.Item
        onClick={actions.drain}
        icon={<i className="i-la-battery-quarter text-2xl mr-2" />}
      >
        Drain
      </Menu.Item>
      <Menu.Item color="red" onClick={actions.hide} icon={<HideIcon />}>
        Hide
      </Menu.Item>
      <Menu.Item
        onClick={actions.unregister}
        icon={<i className="i-la-times text-2xl mr-2 bg-red-500" />}
      >
        Remove
      </Menu.Item>
      <Menu.Item color="red" onClick={handleDelete} icon={<TrashIcon />}>
        Delete
      </Menu.Item>
    </Menu>
  );
};

export default QueueMenu;
