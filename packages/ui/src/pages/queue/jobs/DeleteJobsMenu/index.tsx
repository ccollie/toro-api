import { ActionIcon, Badge, createStyles, Group, Menu } from '@mantine/core';
import React, { useState } from 'react';
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
import { JobSearchStatus } from 'src/types';
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
  queueId: string;
  jobCount?: number;
  selectedIds: string[];
  filtered?: boolean;
  status: JobSearchStatus;
  onBulkAction?: (action: BulkActionType, ids: string[]) => void;
}

export function DeleteJobsMenu(props: TProps) {
  const { filtered, onBulkAction, queueId, status, selectedIds = [] } = props;
  const { classes, theme } = useStyles();
  const menuIconColor =
    theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 5 : 6];
  const [loading, setLoading] = useState(false);

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

  const toast = useToast();
  const { canClean, handleDelete } = useJobBulkActions(
    queueId,
    status,
    onBulkAction,
  );

  function displayError(title: string, description: string) {
    toast.error({
      title,
      description,
      status: 'error',
      duration: 5000,
    });
  }

  async function handleDeleteByPattern(pattern: string) {
    setLoading(true);
    deleteJobsByPattern(queueId, pattern, status)
      .then((removed) => {
        toast.success({
          title: 'Jobs deleted',
          description: `${removed} Jobs matching ${pattern} have been deleted`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      })
      .catch((err) => {
        displayError('Error deleting jobs', err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  async function handleDeleteByFilter(filter: string, pattern?: string) {
    setLoading(true);
    deleteJobsByFilter(queueId, filter, status, pattern)
      .then((removed) => {
        toast.success({
          title: 'Jobs deleted',
          description: `${removed} Jobs matching filter have been deleted`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      })
      .catch((err) => {
        displayError('Error deleting jobs by filter', err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  async function handleDeleteSelected() {
    setLoading(true);
    handleDelete(selectedIds).finally(() => setLoading(false));
  }

  function cleanJobs(
    status: JobSearchStatus,
    grace?: number,
    limit?: number,
  ): Promise<void> {
    setLoading(true);
    // Status is a subset of JobStatus so the cast is safe
    return cleanQueue(queueId, grace ?? 0, limit, status)
      .then((count: number | undefined) => {
        toast.success('Cleaned ' + (count ?? 0) + ' jobs');
      })
      .finally(() => {
        setLoading(false);
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
            <ActionIcon color="red">
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
            disabled={!selectedIds.length}
            onClick={handleDeleteSelected}
          >
            <Group position="apart">
              <div>Delete Selected</div>
              {props.selectedIds.length && (
                <Badge
                  size="sm"
                  variant="filled"
                  className={classes.selectedBadge}
                >
                  {props.selectedIds.length}
                </Badge>
              )}
            </Group>
          </Menu.Item>
          <Menu.Item
            onClick={openPatternDialog}
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
            disabled={!filtered}
          >
            Delete By Filter
          </Menu.Item>
          <Menu.Item
            icon={<ClearIcon color={menuIconColor} />}
            disabled={!canClean}
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
