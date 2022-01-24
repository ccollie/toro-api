import { Group } from '@mantine/core';
import React from 'react';
import type { Job, JobFragment, Queue, QueueJobActions, Status } from '@/types';
import { JobBulkActions } from './JobBulkActions';

interface BulkActionToolbarOpts {
  queueId: Queue['id'];
  status: Status;
  actions: QueueJobActions;
  selectedItems: Array<Job | JobFragment>;
  onCleanSelected: () => void;
  onBulkAction: (action: string, ids: string[]) => void;
}

const BulkActionToolbar: React.FC<BulkActionToolbarOpts> = (props) => {
  const {
    queueId,
    selectedItems,
    onBulkAction,
    onCleanSelected,
    status,
  } = props;
  const selectedCount = selectedItems.length;

  return (
    <Group position="apart">
      <div className="flex-none">
        {selectedCount > 0 && (
          <span
            style={{
              textAlign: 'left',
            }}
          >
            Selected {selectedCount} Item{selectedCount ? 's' : ''}
            <a style={{ marginLeft: 8 }} onClick={onCleanSelected}>
              Clear
            </a>
          </span>
        )}
      </div>
      <div className="flex-auto">
        <JobBulkActions
          queueId={queueId}
          status={status}
          selected={selectedItems}
          onBulkAction={onBulkAction}/>
      </div>
    </Group>
  );
};

export default BulkActionToolbar;
