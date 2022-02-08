import { JobStatus } from '@/types';
import React, { Fragment, useEffect, useState } from 'react';
import type { Job, JobFragment, Status } from '@/types';
import { useDisclosure, useQueue, useToast, useWhyDidYouUpdate } from '@/hooks';
import { TrashIcon, ClearIcon, ExportIcon, AddIcon, ArrowUpIcon } from '@/components/Icons';
import CleanJobsModal from '../CleanJobsModal';
import AddJobDialog from '../AddJobDialog';
import { cleanQueue, useJobBulkActions } from 'src/services';
import type { BulkActionType } from 'src/services';
import { ReloadIcon } from '@radix-ui/react-icons';
import { ActionIcon, Badge, Group, Tooltip } from '@mantine/core';
import ExportJobsModal from '../ExportJobsModal';


interface BulkJobActionsProps {
  queueId: string;
  status: Status;
  selected: Array<JobFragment | Job>;
  filter?: string;
  onBulkAction?: (action: BulkActionType, ids: string[]) => void;
}

export const JobBulkActions = (props: BulkJobActionsProps) => {
  const { status, queueId, onBulkAction } = props;
  const toast = useToast();
  const { handleDelete, handlePromote, handleRetry, canClear, canPromote, canDelete, canRetry } =
    useJobBulkActions(queueId, status, onBulkAction);

  const [selectedIds, setSelectedIds] = useState(getSelectedIds());
  const [isPromoteDisabled, setIsPromoteDisabled] = useState(canPromote);
  const [isDeleteDisabled, setIsDeleteDisabled] = useState(canDelete);
  const [isRetryDisabled, setIsRetryDisabled] = useState(canRetry);
  const [isClearDisabled, setIsClearDisabled] = useState(canClear);

  const [isPromoting, setIsPromoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const count = selectedIds.length;
  const { queue } = useQueue(queueId);

  useEffect(() => {
    const count = selectedIds.length;
    setIsPromoteDisabled(!canPromote || count === 0);
    setIsDeleteDisabled(!canDelete || count === 0);
    setIsRetryDisabled(!canRetry || count === 0);
    setIsClearDisabled(!canClear || count === 0);
  }, [canPromote, canDelete, canRetry, canClear, selectedIds]);

  useEffect(() => {
    setSelectedIds(getSelectedIds());
  }, [props.selected]);

  function getSelectedIds() {
    return Array.from(props.selected ?? []).map((x) => x.id);
  }

  useWhyDidYouUpdate('JobBulkActions', props);

  const {
    isOpen: isCleanDialogOpen,
    onOpen: openCleanDialog,
    onClose: closeCleanDialog,
  } = useDisclosure({
    defaultIsOpen: false,
  });

  const {
    isOpen: isExportDialogOpen,
    onClose: closeExportDialog,
    onOpen: openExportDialog,
  } = useDisclosure({
    defaultIsOpen: false,
  });

  const {
    isOpen: isAddDialogOpen,
    onClose: closeAddDialog,
    onOpen: openAddDialog,
  } = useDisclosure({
    defaultIsOpen: false,
  });

  function cleanJobs(status: Status, grace?: number, limit?: number): Promise<void> {
    // Status is a subset of JobStatus so the cast is safe
    return cleanQueue(queueId, grace ?? 0, limit, status as JobStatus).then(
      (count: number | undefined) => {
        toast.success('Cleaned ' + (count ?? 0) + ' jobs');
      }
    );
  }

  function onRetry(event: React.MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    setIsRetrying(true);
    handleRetry(selectedIds).finally(() => setIsRetrying(false));
  }

  function onPromote(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    setIsPromoting(true);
    handlePromote(selectedIds).finally(() => setIsPromoting(false));
  }

  function onDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    setIsDeleting(true);
    handleDelete(selectedIds).finally(() => setIsDeleting(false));
  }

  return (
    <Fragment>
      <Group grow={false} spacing="sm" position="apart">
        <Tooltip label="Add" withArrow>
          <ActionIcon onClick={openAddDialog} disabled={queue.isReadonly}>
            <AddIcon size={36} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Retry" withArrow>
          <ActionIcon onClick={onRetry} disabled={isRetryDisabled} loading={isRetrying}>
            <ReloadIcon />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Promote" withArrow>
          <ActionIcon onClick={onPromote} disabled={isPromoteDisabled} loading={isPromoting}>
            <ArrowUpIcon size={36}/>
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete" withArrow>
          <ActionIcon
            color="red"
            onClick={onDelete}
            disabled={isDeleteDisabled}
            loading={isDeleting}
          >
            <TrashIcon />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Clear" withArrow>
          <ActionIcon color="red" onClick={openCleanDialog} disabled={isClearDisabled}>
            <ClearIcon size={36} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Export" withArrow>
          <ActionIcon onClick={openExportDialog} disabled={!count}>
            <ExportIcon size={36} />
          </ActionIcon>
        </Tooltip>
        <Badge>
          {selectedIds.length} selected
        </Badge>
      </Group>
      {isCleanDialogOpen && (
        <CleanJobsModal
          status={status}
          isOpen={isCleanDialogOpen}
          onClose={closeCleanDialog}
          onCleanJobs={cleanJobs}
        />
      )}
      {isExportDialogOpen && (
        <ExportJobsModal
          queueId={queueId}
          onClose={closeExportDialog}
          status={status}
          filter={props.filter || ''}
        />
      )}
      {isAddDialogOpen && <AddJobDialog queueId={queueId} onClose={closeAddDialog} isOpen />}
    </Fragment>
  );
};

export default JobBulkActions;
