import type { BulkStatusItem, Queue, JobSearchStatus } from '@/types';
import { useToast, useQueue } from '@/hooks';
import { Cross1Icon } from '@radix-ui/react-icons';
import React, { useCallback } from 'react';
import { bulkDeleteJobs, bulkPromoteJobs, bulkRetryJobs } from '@/services';
import { useJobsStore, usePreferencesStore } from '@/stores';
import { useModals } from '@mantine/modals';
import { Text } from '@mantine/core';

export type BulkActionType = 'delete' | 'retry' | 'promote' | 'clean';

export type OnBulkJobAction = (action: BulkActionType, ids: string[]) => void;

export function useJobBulkActions(
  queueId: Queue['id'],
  status: JobSearchStatus,
  onBulkAction?: OnBulkJobAction,
) {
  const toast = useToast();
  const { queue, decreaseJobCount } = useQueue(queueId);
  const modals = useModals();
  const confirmDangerousActions = usePreferencesStore(
    (state) => state.confirmDangerousActions,
  );

  const removeJobFromStore = useJobsStore(state => state.removeJob);
  const getJob = useJobsStore(state => state.getJob);

  const ActionPastTense: Record<BulkActionType, string> = {
    delete: 'deleted',
    retry: 'retried',
    promote: 'promoted',
    clean: 'cleared',
  };

  function validState(statuses: JobSearchStatus[]): boolean {
    return !queue.isReadonly && statuses.includes(status);
  }

  const canClean = validState(['completed', 'failed']);
  const canRetry = validState(['completed', 'failed']);
  const canPromote = validState(['delayed']);

  const canDo: Record<BulkActionType, boolean> = {
    delete: canClean,
    retry: canRetry,
    promote: canPromote,
    clean: canClean,
  };

  function getSuccessMessage(action: BulkActionType, count: number) {
    const verb = ActionPastTense[action];
    return `${count} ${status} jobs ${verb}`;
  }

  function showReadonly(action: BulkActionType) {
    const title = `Queue ${queue.name} is readonly`;
    toast.notify({
      color: 'red',
      title,
      message: `You can't ${action} jobs in a read-only queue.`,
      icon: <Cross1Icon />,
    });
  }

  type BulkHandlerFn = (
    queueId: string,
    ids: string[],
  ) => Promise<BulkStatusItem[]>;

  function handleResult(action: BulkActionType, results: BulkStatusItem[]) {
    const items = results.filter((x) => x.success).map((x) => x.id);
    const msg = getSuccessMessage(action, items.length);
    toast.success(msg);
    onBulkAction && onBulkAction(action, items);
  }

  function processItems(
    action: BulkActionType,
    fn: BulkHandlerFn,
    ids: string[],
  ) {
    return fn(queueId, ids)
      .then((value) => {
        handleResult(action, value);
      })
      .catch((err) => {
        toast.error(err.message);
      });
  }

  const openConfirmModal = (
    action: BulkActionType,
    fn: BulkHandlerFn,
    ids: string[],
  ) => {
    const count = ids.length;
    return new Promise<void>((resolve, reject) => {
      return modals.openConfirmModal({
        title: `${action} ${count} jobs?`,
        children: <Text size="md">This action cannot be undone !.</Text>,
        labels: {
          confirm: `${action} jobs`,
          cancel: 'Cancel',
        },
        onCancel: () => reject(),
        onConfirm: () => {
          processItems(action, fn, ids).then(resolve).catch(reject);
        },
      });
    });
  };

  function wrapHandler(action: BulkActionType, fn: BulkHandlerFn) {
    return useCallback(
      async (selectedIds: string[]) => {
        if (queue.isReadonly) {
          showReadonly(action);
          return;
        }
        if (!canDo[action]) {
          toast.warn(`You can't ${action} jobs in this state`);
          return;
        }
        if (!confirmDangerousActions) {
          processItems(action, fn, selectedIds);
          return;
        }
        openConfirmModal(action, fn, selectedIds);
      },
      [action, queueId, fn],
    );
  }

  function onDelete(queueId: string, ids: string[]): Promise<BulkStatusItem[]> {
    return bulkDeleteJobs(queueId, ids).then((items) => {
      const removed = items.filter((x) => x.success).map((x) => x.id);
      removed.forEach((jobId) => {
        const job = getJob(jobId);
        removeJobFromStore(jobId);
        if (job && job.state) {
          decreaseJobCount(job.state);
        }
      });
      return items;
    });
  }


  const handleDelete = wrapHandler('delete', onDelete);
  const handleRetry = wrapHandler('retry', bulkRetryJobs);
  const handlePromote = wrapHandler('promote', bulkPromoteJobs);

  return {
    canDelete: canClean,
    canClean: canClean,
    canRetry,
    canPromote,
    handleDelete,
    handleRetry,
    handlePromote,
  };
}
