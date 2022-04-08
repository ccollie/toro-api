import { Job, JobFragment, JobSearchStatus, Queue } from '@/types';
import React, { useCallback, useEffect, useState } from 'react';
import type { JobView, LocationGenerics } from '@/types';
import { useDisclosure, useWhyDidYouUpdate } from '@/hooks';
import {
  ExportIcon,
  AddIcon,
  ArrowUpIcon,
  FilterIcon,
  TableIcon,
  IdCardLightIcon,
} from '@/components/Icons';
import { useNavigate } from '@tanstack/react-location';
import { useJobBulkActions } from '@/services';
import type { BulkActionType } from '@/services';
import { ReloadIcon } from '@radix-ui/react-icons';
import {
  ActionIcon,
  Button,
  Checkbox,
  Collapse,
  Group,
  Space,
  Tooltip,
} from '@mantine/core';
import { DeleteJobsMenu } from '../DeleteJobsMenu';
import { useJobsStore } from 'src/stores';
import shallow from 'zustand/shallow';
import { QueryBar } from './QueryBar';
import ExportJobsModal from '../ExportJobsModal';
import AddJobDialog from '../AddJobDialog';
import JobSchemaModal from '../JobSchemaModal';
import Pagination from '@/components/Pagination';
import FilteredPager from '../FilteredPager';

interface JobsToolbarProps {
  queue: Queue;
  status: JobSearchStatus;
  jobs: Array<Job | JobFragment>;
  filter?: string;
  page?: number;
  pageCount?: number;
  view?: JobView;
  onBulkAction?: (action: BulkActionType, ids: string[]) => void;
}

export const JobsToolbar = (props: JobsToolbarProps) => {
  // useWhyDidYouUpdate('JobsToolbar', props);

  const { status, queue, jobs, onBulkAction, view = 'card', pageCount } = props;
  const queueId = queue.id;

  const { handlePromote, handleRetry, canPromote, canDelete, canRetry } =
    useJobBulkActions(queueId, status, onBulkAction);

  const [_selected, selectedJobs, selectAll, unselectAll] = useJobsStore(
    (state) => [
      state.selected,
      state.selectedJobs,
      state.selectAll,
      state.unselectAll
    ],
    shallow,
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPromoteDisabled, setIsPromoteDisabled] = useState(canPromote);
  const [isRetryDisabled, setIsRetryDisabled] = useState(canRetry);

  const [isPromoting, setIsPromoting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [indeterminate, setIndeterminate] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const count = _selected.size;
    setIsPromoteDisabled(!canPromote || count === 0);
    setIsRetryDisabled(!canRetry || count === 0);
  }, [canPromote, canDelete, canRetry, _selected]);

  useEffect(() => {
    const count = _selected.size;
    setSelectedIds(Array.from(_selected));
    const isIndeterminate = count > 0 && count < jobs.length;
    setIndeterminate(isIndeterminate);
  }, [_selected]);

  useWhyDidYouUpdate('JobBulkActions', {
    ...props,
    selectedJobs,
    indeterminate,
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

  const onFilterReset = useCallback(() => {
    console.log('filter was reset');
    updateSearchParams({ jobFilter: '' });
  }, []);

  const onApplyFilter = useCallback((filter: string) => {
    console.log('filter was applied', filter);
    updateSearchParams({ jobFilter: filter });
  }, []);

  const onSelectAllClick = useCallback(() => {
    const checkedCount = _selected.size;
    const jobCount = jobs.length;
    if (checkedCount === jobCount) {
      unselectAll();
    } else {
      selectAll();
    }
  }, [selectAll, unselectAll]);

  return (
    <div style={{ marginBottom: '9px' }}>
      <Group grow={false} spacing="sm" position="apart">
        <Group grow={false} spacing="xs" position="left">
          <Checkbox
            onChange={onSelectAllClick}
            indeterminate={indeterminate}
            disabled={!jobs.length}
            checked={_selected.size > 0}
          />
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
            <DeleteJobsMenu
              queue={queue}
              status={status}
              onBulkAction={onBulkAction}
            />
          </Tooltip>
          <Tooltip label="Export" withArrow>
            <ActionIcon onClick={openExportDialog} disabled={!pageCount}>
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
