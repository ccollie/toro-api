import { TrashIcon } from '@/components/Icons/Trash';
import { MutationIcon } from '@/components/MutationIcon';
import { useDisclosure } from '@/hooks';
import { DeleteMetricDocument, DeleteMetricMutationVariables, MetricFragment } from 'src/types';
import MetricDialog from '../MetricDialog';
import React from 'react';
import { Group } from '@mantine/core';

interface MetricActionProps {
  queueId: string;
  metric: MetricFragment;
}

export const MetricActions: React.FC<MetricActionProps> = props => {
  const { metric, queueId } = props;

  const {
    isOpen: isAddMetricDialogOpen,
    onOpen: openAddMetricDialog,
    onClose: closeAddMetricDialog,
  } = useDisclosure();

  return (
    <>
      <Group spacing="sm">
        <i className="la la-edit" onClick={openAddMetricDialog} />
        <MutationIcon<DeleteMetricMutationVariables>
          icon={<TrashIcon />}
          danger={true}
          mutation={DeleteMetricDocument}
          variables={{
            input: { metricId: metric.id, queueId: metric.queueId },
          }}
        />
      </Group>
      {isAddMetricDialogOpen && queueId && (
        <MetricDialog
          queueId={queueId}
          metric={metric}
          isOpen={isAddMetricDialogOpen}
          onClose={closeAddMetricDialog}
        />
      )}
    </>
  );
};
