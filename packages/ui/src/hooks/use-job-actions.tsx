import {
  deleteJob,
  discardJob,
  getJobLogs,
  promoteJob,
  retryJob,
  moveJobToCompleted,
  moveJobToFailed
} from '@/services/queue';
import type { Job, JobFragment, Queue, SingleJobActions } from '@/types';
import { Text } from '@mantine/core';
import { useModals } from '@mantine/modals';
import { useClipboard } from '@mantine/hooks';
import { Cross1Icon } from '@radix-ui/react-icons';
import React, { useCallback } from 'react';
import { useToast, useQueue } from '@/hooks';
import { useUpdateEffect } from '@/hooks/use-update-effect';
import { removeTypename } from '@/lib';
import { usePreferencesStore } from '@/stores';

// TODO: Move this to a separate file
const DEFAULT_JOB_NAME = '__default__';

export function useJobActions(queueId: Queue['id'], job: Job | JobFragment): SingleJobActions {
  const { queue } = useQueue(queueId);
  const toast = useToast();
  const modals = useModals();
  const clipboard = useClipboard({ timeout: 500 });

  const confirmDangerousActions = usePreferencesStore(state => state.confirmDangerousActions);

  const description = getJobDescriptor();

  type ActionType = 'delete' | 'retry' | 'promote' | 'discard' | 'moveToCompleted' | 'moveToFailed';

  const actionText = {
    delete: 'Delete',
    retry: 'Retry',
    promote: 'Promote',
    discard: 'Discard',
    moveToCompleted: 'Move to Completed',
    moveToFailed: 'Move to Failed'
  };

  const pastTenseActions: Record<ActionType, string> = {
    delete: 'Deleted',
    retry: 'Retried',
    promote: 'Promoted',
    discard: 'Discarded',
    moveToCompleted: 'Moved to completed',
    moveToFailed: 'Moved to failed',
  };

  function showReadonly(action: ActionType) {
    const title = `Queue ${queue.name} is readonly`;
    toast.notify({
      color:'red',
      title,
      message: `You can't ${action} jobs in a read-only queue.`,
      icon: <Cross1Icon />,
    });
  }


  type JobHandlerFn = (queueId: string, ids: string) => Promise<void>;

  function getJobDescriptor() {
    const {id, name = DEFAULT_JOB_NAME} = job;
    if (name === DEFAULT_JOB_NAME)  return  'job:' + id;
    return `job ${name}:${id}`;
  }

  function handleResult(
    action: ActionType
  ) {
    const msg = `${pastTenseActions[action]} ${description}`;
    setTimeout(() => toast.success(msg), 0);
   }

  function processItems(action: ActionType, fn: JobHandlerFn) {
    return fn(queueId, job.id).then(() => {
      handleResult(action);
    }).catch(err => {
      const message = err.message || `${err}`;
      toast.notify({
        color: 'red',
        title: `Error trying to #{action} ${description}`,
        message,
        icon: <Cross1Icon />,
      });
    });
  }

  const openConfirmModal = (action: ActionType, fn: JobHandlerFn) => {
    const confirmText = actionText[action];
    return new Promise<void>((resolve, reject) => {
      return modals.openConfirmModal({
        centered: true,
        title: `${action} ${description} ?`,
        children: (
          <Text size="md">
            This action cannot be undone !.
          </Text>
        ),
        labels: { confirm: confirmText, cancel: 'Cancel' },
        confirmProps: { color: 'red' },
        onClose: () => {
          resolve();
        },
        onConfirm: () => {
          processItems(action, fn).then(resolve).catch(reject);
        },
      });
    });
  };

  function wrapHandler(action: ActionType, fn: JobHandlerFn) {
    return useCallback(async () => {
      if (queue.isReadonly) {
        showReadonly(action);
        return;
      }
      if (!confirmDangerousActions) {
        return processItems(action, fn);
      }
      await openConfirmModal(action, fn);
    }, [action, queueId, fn]);
  }

  const handleDelete = wrapHandler('delete', deleteJob);
  const handleRetry = wrapHandler('retry', retryJob);
  const handlePromote = wrapHandler('promote', promoteJob);
  const handleDiscard = wrapHandler('discard', discardJob);
  const handleMoveToCompleted = wrapHandler('moveToCompleted', moveJobToCompleted);
  const handleMoveToFailed = wrapHandler('moveToFailed', moveJobToFailed);

  useUpdateEffect(() => {
    toast.error(`Failed to copy ${description} to clipboard`);
  }, [clipboard.error]);

  useUpdateEffect(() => {
    if (clipboard.copied) {
      toast.success(`${description} copied to clipboard`);
    }
  }, [clipboard.copied]);

  const copyToClipboard = useCallback(() => {
    const data = removeTypename(job);
    const str = JSON.stringify(data);
    clipboard.copy(str);
  }, [job?.id]);

  function getLogs() {
    return getJobLogs(queueId, job.id);
  }
  return {
    promote: handlePromote,
    retry: handleRetry,
    delete: handleDelete,
    discard: handleDiscard,
    moveToCompleted: handleMoveToCompleted,
    moveToFailed: handleMoveToFailed,
    copyToClipboard,
    getLogs
  };
}
