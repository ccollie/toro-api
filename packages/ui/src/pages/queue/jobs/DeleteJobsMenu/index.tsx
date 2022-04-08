import { ActionIcon, Badge, createStyles, Group, Menu } from '@mantine/core';
import React from 'react';
import { ClearIcon, FilterIcon, TrashIcon } from 'src/components/Icons';
import { useDisclosure, useToast } from 'src/hooks';
import { ucFirst } from 'src/lib';
import {
  BulkActionType,
  cleanQueue,
  deleteJobsByFilter,
  deleteJobsByPattern,
  useJobBulkActions,
} from 'src/services';
import { useJobsStore } from 'src/stores';
import { JobSearchStatus, Queue } from 'src/types';
import CleanJobsModal from '../CleanJobsModal';
import { DeletePatternDialog } from './DeletePatternDialog';

const useStyles = createStyles((theme) => ({
  button: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },

  menuControl: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    border: 0,
    borderLeft: `1px solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white
    }`,
  },

  mainLinkIcon: {
    marginRight: theme.spacing.sm,
    color:
      theme.colorScheme === 'dark'
        ? theme.colors.dark[2]
        : theme.colors.gray[6],
  },

  icon: {
    marginRight: theme.spacing.sm,
    color:
      theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 5 : 6],
  },

  selectedBadge: {
    padding: 0,
    marginRight: 5,
    float: 'right',
    minWidth: 20,
    height: 20,
    pointerEvents: 'none',
  },
}));

interface TProps {
  queue: Queue;
  jobCount?: number;
  filter?: string;
  status: JobSearchStatus;
  onBulkAction?: (action: BulkActionType, ids: string[]) => void;
}

export function DeleteJobsMenu(props: TProps) {
  const { filter, onBulkAction, queue, status } = props;
  const { classes, theme } = useStyles();
  const menuIconColor =
    theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 5 : 6];

  const filtered = (filter ?? '').length > 0;

  const selected = useJobsStore(state => state.selected);
  const selectedIds = Array.from(selected);

  const isReadonly = queue.isReadonly;

  const {
    isOpen: isPatternDialogOpen,
    onOpen: openPatternDialog,
    onClose: closePatternDialog,
  } = useDisclosure({
    defaultIsOpen: false,
  });

  const {
    isOpen: isCleanDialogOpen,
    onOpen: openCleanDialog,
    onClose: closeCleanDialog,
  } = useDisclosure({
    defaultIsOpen: false,
  });

  const queueId = queue.id;

  const toast = useToast();
  const { canClean, handleDelete } = useJobBulkActions(
    queueId,
    status,
    onBulkAction,
  );

  function displaySuccess(title: string, description: string) {
    toast.success({
      title,
      description,
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  }

  function displayError(title: string, description: string) {
    toast.error({
      title,
      description,
      status: 'error',
      duration: 5000,
    });
  }

  async function handleDeleteByPattern(pattern: string) {
    deleteJobsByPattern(queueId, pattern, status)
      .then((removed) => {
        displaySuccess('Success', `${removed} jobs deleted`);
      })
      .catch((err) => {
        displayError('Error deleting jobs', err.message);
      });
  }

  async function handleDeleteByFilter() {
    // todo: pattern
    deleteJobsByFilter(queueId, filter!, status)
      .then((removed) => {
        displayError('Jobs deleted', `${removed} Jobs matching ${filter} have been deleted`);
      })
      .catch((err) => {
        displayError('Error deleting jobs by filter', err.message);
      });
  }

  async function handleDeleteSelected() {
    handleDelete(selectedIds)
      .then((removed) => {
        displaySuccess('Jobs deleted', `${removed} Jobs have been deleted`);
      })
      .catch((err) => {
        displayError('Error deleting jobs', err.message);
      });
  }

  function cleanJobs(
    status: JobSearchStatus,
    grace?: number,
    limit?: number,
  ): Promise<void> {
    // Status is a subset of JobStatus so the cast is safe
    return cleanQueue(queueId, grace ?? 0, limit, status)
      .then((count: number | undefined) => {
        toast.success('Cleaned ' + (count ?? 0) + ' jobs');
      });
  }

  return (
    <>
      <Group noWrap spacing={0}>
        <Menu
          size="lg"
          transition="pop"
          placement="end"
          withArrow
          control={
            <ActionIcon color="red" disabled={isReadonly}>
              <TrashIcon className={classes.menuControl} />
            </ActionIcon>
          }
        >
          <Menu.Item
            icon={
              <i
                className={`la i-la-check-square ${classes.icon}`}
                color={menuIconColor}
              />
            }
            disabled={isReadonly || !selectedIds.length}
            onClick={handleDeleteSelected}
          >
            <Group position="apart">
              <div>Delete Selected</div>
              {selectedIds.length && (
                <Badge
                  size="sm"
                  variant="filled"
                  className={classes.selectedBadge}
                >
                  {selectedIds.length}
                </Badge>
              )}
            </Group>
          </Menu.Item>
          <Menu.Item
            onClick={openPatternDialog}
            disabled={isReadonly}
            icon={
              <i
                className={`la i-la-asterisk ${classes.icon}`}
                color={menuIconColor}
              />
            }
          >
            Delete By Pattern
          </Menu.Item>
          <Menu.Item
            icon={<FilterIcon color={menuIconColor} />}
            disabled={isReadonly || !filtered}
            onClick={handleDeleteByFilter}
          >
            Delete By Filter
          </Menu.Item>
          <Menu.Item
            icon={<ClearIcon color={menuIconColor} />}
            disabled={isReadonly || !canClean}
            onClick={openCleanDialog}
          >
            Clean {ucFirst(`${props.status}`)} Jobs
          </Menu.Item>
        </Menu>
      </Group>
      <DeletePatternDialog
        isOpen={isPatternDialogOpen}
        onClose={closePatternDialog}
        onDelete={handleDeleteByPattern}
      />
      <CleanJobsModal
        status={status}
        isOpen={isCleanDialogOpen}
        onClose={closeCleanDialog}
        onCleanJobs={cleanJobs}
      />
    </>
  );
}
