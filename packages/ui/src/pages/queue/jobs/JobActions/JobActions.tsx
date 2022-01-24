import { JobStatus } from '@/types';
import React, { useState } from 'react';
import { useJobActions, useQueue } from '@/hooks';
import type { Job, JobFragment, Status } from '@/types';
import {
  RetryIcon,
  TrashIcon,
  ClipboardCopyIcon,
  PromoteIcon,
  EllipsisVerticalIcon,
} from '@/components/Icons';
import { Group, ActionIcon, Tooltip, Menu } from '@mantine/core';

interface JobActionsProps {
  queueId: string;
  job: Job | JobFragment;
  status?: Status;
  onSelect?: (job: Job) => void;
}

interface JobMenuProps extends JobActionsProps {
  readonly: boolean;
}

function JobActionsMenu(props: JobMenuProps) {
  const { queueId, job, readonly } = props;
  const actions = useJobActions(queueId, job);

  return (
    <Menu
      withArrow
      aria-label="Job actions"
      control={
        <ActionIcon>
          <EllipsisVerticalIcon style={{ cursor: 'pointer' }} />
        </ActionIcon>
      }
    >
      {job.state === 'completed' && (
        <Menu.Item
          disabled={readonly}
          // onClick={() =>
          //   openNewJobEditor({
          //     name: job.name,
          //     data: job.data,
          //     options: job.opts,
          //   })
          // }
        >
          Queue again
        </Menu.Item>
      )}
      {job.state === JobStatus.Failed && (
        <Menu.Item disabled={readonly} icon={<RetryIcon />} onClick={actions.retry}>
          Retry
        </Menu.Item>
      )}
      {job.state === JobStatus.Waiting && (
        <Menu.Item disabled={readonly} onClick={actions.moveToCompleted}>
          Move to completed
        </Menu.Item>
      )}
      {job.state === JobStatus.Waiting && (
        <Menu.Item disabled={readonly} onClick={actions.moveToFailed}>
          Move to failed
        </Menu.Item>
      )}
      <Menu.Item icon={<ClipboardCopyIcon />} onClick={actions.copyToClipboard}>
        Save as JSON
      </Menu.Item>

      {/*<Menu.Item onClick={() => shareJob(job.id)}>Share</Menu.Item>*/}
      {job.state === JobStatus.Delayed && (
        <Menu.Item disabled={readonly} icon={<PromoteIcon />} onClick={actions.promote}>
          Promote
        </Menu.Item>
      )}
      <Menu.Item disabled={readonly} onClick={actions.discard}>
        Discard
      </Menu.Item>
      {/*<Menu.Item onClick={() => openJobLogs(sharedMutationArg)}>Logs</Menu.Item>*/}
    </Menu>
  );
}

export const JobActions = (props: JobActionsProps) => {
  const { job, status = props.job.state, queueId } = props;
  const isFinished = ['completed', 'failed'].includes(status);
  const isDelayed = status === 'delayed';
  const { queue } = useQueue(queueId);
  const isReadonly = queue?.isReadonly;

  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  const { delete: deleteJob, promote, retry, copyToClipboard } = useJobActions(queueId, job);

  function handleRetry(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    setIsRetrying(true);
    retry().finally(() => {
      setIsRetrying(false);
    });
  }

  function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    setIsDeleting(true);
    deleteJob().finally(() => {
      setIsDeleting(false);
    });
  }

  function handlePromote(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    setIsPromoting(true);
    promote().finally(() => {
      setIsPromoting(false);
    });
  }

  async function handleCopy(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    copyToClipboard();
  }

  return (
    <Group spacing="xs" grow={false} className="actions">
      {isDelayed && (
        <Tooltip label="Promote Job" withArrow>
          <ActionIcon onClick={handlePromote} disabled={isReadonly} loading={isPromoting}>
            <PromoteIcon />
          </ActionIcon>
        </Tooltip>
      )}
      {isFinished && (
        <Tooltip label="Retry Job" withArrow>
          <ActionIcon onClick={handleRetry} disabled={isReadonly} loading={isRetrying}>
            <RetryIcon />
          </ActionIcon>
        </Tooltip>
      )}
      <Tooltip label="Delete Job" withArrow>
        <ActionIcon onClick={handleDelete} color="red" disabled={isReadonly} loading={isDeleting}>
          <TrashIcon />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Copy to clipboard" withArrow>
        <ActionIcon onClick={handleCopy}>
          <ClipboardCopyIcon />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="More" withArrow>
        <JobActionsMenu readonly={queue.isReadonly} queueId={queueId} job={job} />
      </Tooltip>
    </Group>
  );
};

export default JobActions;
