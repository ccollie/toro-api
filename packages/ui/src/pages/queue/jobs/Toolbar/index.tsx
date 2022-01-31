import { JobStatus, JobView, LocationGenerics } from '@/types';
import React, { useCallback, useEffect, useState } from 'react';
import type { Job, JobFragment, Status } from '@/types';
import { useDisclosure, useToast, useWhyDidYouUpdate, useQueue } from '@/hooks';
import {
  TrashIcon,
  ClearIcon,
  ExportIcon,
  AddIcon,
  ArrowUpIcon,
  FilterIcon,
  TableIcon,
  IdCardLightIcon,
} from '@/components/Icons';
import { useNavigate } from 'react-location';
import { cleanQueue, useJobBulkActions } from '@/services';
import type { BulkActionType } from '@/services';
import { ReloadIcon } from '@radix-ui/react-icons';
import {
  ActionIcon,
  Button,
  Collapse,
  Group,
  Space,
  Tooltip,
} from '@mantine/core';
import { QueryBar } from './QueryBar';
import ExportJobsModal from '../ExportJobsModal';
import AddJobDialog from '../AddJobDialog';
import CleanJobsModal from '../CleanJobsModal';
import JobSchemaModal from '../JobSchemaModal';
import Pagination from '@/components/Pagination';
import FilteredPager from '../FilteredPager';

interface BulkJobActionsProps {
  queueId: string;
  status: Status;
  selected: Array<JobFragment | Job>;
  filter?: string;
  page?: number;
  pageCount?: number;
  view?: JobView;
  onBulkAction?: (action: BulkActionType, ids: string[]) => void;
}

export const JobsToolbar = (props: BulkJobActionsProps) => {
  useWhyDidYouUpdate('JobsToolbar', props);

  const { status, queueId, onBulkAction, view = 'card', pageCount } = props;
  const toast = useToast();
  const {
    handleDelete,
    handlePromote,
    handleRetry,
    canClear,
    canPromote,
    canDelete,
    canRetry,
  } = useJobBulkActions(queueId, status, onBulkAction);

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
  const navigate = useNavigate();

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

  const {
    isOpen: isSchemaModalOpen,
    onClose: closeSchemaModal,
    onOpen: openSchemaModal,
  } = useDisclosure({
    defaultIsOpen: false,
  });

  const { isOpen: isFilterPanelOpen, onToggle: toggleFilterPanel } =
    useDisclosure({
      defaultIsOpen: false,
    });

  function updateSearchParams(search: Partial<LocationGenerics['Search']>) {
    navigate({
      to: '.',
      search: (old) => ({
        ...old,
        ...(search || {}),
      }),
    });
  }

  function showTable() {
    updateSearchParams({ jobView: 'table' });
  }

  function showCards() {
    updateSearchParams({ jobView: 'card' });
  }

  function cleanJobs(
    status: Status,
    grace?: number,
    limit?: number,
  ): Promise<void> {
    // Status is a subset of JobStatus so the cast is safe
    return cleanQueue(queueId, grace ?? 0, limit, status as JobStatus).then(
      (count: number | undefined) => {
        toast.success('Cleaned ' + (count ?? 0) + ' jobs');
      },
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

  const onFilterReset = useCallback(() => {
    console.log('filter was reset');
  }, [queueId]);

  const onApplyFilter = useCallback(
    (filter: string) => {
      console.log('filter was applied', filter);
    },
    [queueId],
  );

  return (
    <div style={{ marginBottom: '9px' }}>
      <Group grow={false} spacing="sm" position="apart">
        <Group grow={false} spacing="xs" position="left">
          <Tooltip label="Retry" withArrow>
            <ActionIcon
              onClick={onRetry}
              disabled={isRetryDisabled}
              loading={isRetrying}
            >
              <ReloadIcon width={36} height={36} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Promote" withArrow>
            <ActionIcon
              onClick={onPromote}
              disabled={isPromoteDisabled}
              loading={isPromoting}
            >
              <ArrowUpIcon size={36} />
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
            <ActionIcon
              color="red"
              onClick={openCleanDialog}
              disabled={isClearDisabled}
            >
              <ClearIcon size={36} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Export" withArrow>
            <ActionIcon onClick={openExportDialog} disabled={!count}>
              <ExportIcon size={36} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Add" withArrow>
            <ActionIcon onClick={openAddDialog} disabled={queue.isReadonly}>
              <AddIcon size={36} />
            </ActionIcon>
          </Tooltip>
          <Button size="sm" onClick={openSchemaModal} variant="default">
            Schema
          </Button>
          <Tooltip label="Filter" withArrow>
            <ActionIcon
              onClick={toggleFilterPanel}
              variant={props.filter?.length ? 'filled' : 'transparent'}
            >
              <FilterIcon size={36} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group grow={false} spacing="xs" position="center">
          <Tooltip label="Table View" withArrow>
            <ActionIcon
              size="md"
              disabled={view === 'table'}
              onClick={showTable}
            >
              <TableIcon size={36} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Card View" withArrow>
            <ActionIcon
              size="md"
              disabled={view === 'card'}
              onClick={showCards}
            >
              <IdCardLightIcon size={36} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <div>
          {!!props.filter ? (
            <FilteredPager pageCount={pageCount ?? 1} queueId={queueId} />
          ) : (
            <Pagination page={props.page} pageCount={props.pageCount ?? 5} />
          )}
        </div>
      </Group>
      <Collapse in={isFilterPanelOpen}>
        <Space h={8} />
        <QueryBar
          queueId={queueId}
          onReset={onFilterReset}
          onApply={onApplyFilter}
        />
      </Collapse>
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
      {isAddDialogOpen && (
        <AddJobDialog queueId={queueId} onClose={closeAddDialog} isOpen />
      )}
      {isSchemaModalOpen && (
        <JobSchemaModal
          queueId={queueId}
          onClose={closeSchemaModal}
          isOpen={isSchemaModalOpen}
        />
      )}
    </div>
  );
};

export default JobsToolbar;
