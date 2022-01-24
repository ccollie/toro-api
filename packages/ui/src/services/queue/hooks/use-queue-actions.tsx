import {
  deleteQueue,
  drainQueue,
  pauseQueue,
  resumeQueue,
  unregisterQueue,
} from '@/services/queue/api';
import type { Queue, QueueActions } from '@/types';
import { useQueue, useToast } from '@/hooks';
import { useCallback } from 'react';
import { ucFirst } from 'src/lib';
import { useHostQueueFilter } from 'src/services/host';
import { useQueueDeleteConfirmModal } from './use-queue-deletion-confirm-modal';
import { usePreferencesStore } from 'src/stores';
import { useModals } from '@mantine/modals';

export function useQueueActions(queueId: Queue['id']): QueueActions {
  const { queue } = useQueue(queueId);
  const toast = useToast();
  const modals = useModals();
  const { navigate, filter, hideQueue, isQueueHidden } = useHostQueueFilter(queue.hostId);
  const confirmDangerousActions = usePreferencesStore((state) => state.confirmDangerousActions);
  const { openConfirmDeleteModal } = useQueueDeleteConfirmModal(queue);

  const queueDescription = `queue "${queue.name}"`;

  const hide = useCallback(async () => {
    hideQueue(queueId);
    if (isQueueHidden(queueId)) {
      toast.success('Queue is now hidden. Go to the filter toolbar to unhide it.');
      navigate(filter);
    }
  }, [queueId]);

  type ActionType = 'delete' | 'pause' | 'resume' | 'drain' | 'unregister';
  type QueueHandlerFn = (id: Queue['id']) => Promise<void>;

  const pastTenseActions: Record<ActionType, string> = {
    delete: 'Deleted',
    pause: 'Paused',
    resume: 'Resumed',
    drain: 'Drained',
    unregister: 'Unregistered',
  };

  function showReadonly(action: ActionType) {
    const title = `Queue ${queue.name} is readonly`;
    toast.error(`You can't ${action} jobs in a read-only queue.`, {
      title,
      message: `You can't ${action} jobs in a read-only queue.`,
    });
  }

  function handleResult(action: ActionType) {
    const msg = `${pastTenseActions[action]} queue "${queue.name}"`;
    setTimeout(() => toast.success(msg), 0);
  }

  function processQueue(action: ActionType, fn: QueueHandlerFn) {
    return fn(queueId)
      .then(() => {
        handleResult(action);
      })
      .catch((err) => {
        const message = err.message || `${err}`;
        toast.error(message, {
          title: `Error trying to ${action} ${queueDescription}`,
        });
      });
  }

  const openConfirmModal = (action: ActionType, fn: QueueHandlerFn) => {
    return new Promise<void>((resolve, reject) => {
      const confirmLabel = ucFirst(action);
      return modals.openConfirmModal({
        centered: true,
        title: `${action} ${queueDescription} ?`,
        labels: {confirm: confirmLabel, cancel: 'Cancel'},
        // confirmProps,
        onClose: () => {
          resolve();
        },
        onConfirm: () => {
          processQueue(action, fn).then(resolve).catch(reject);
        },
      });
    });
  };

  function wrapHandler(action: ActionType, fn: QueueHandlerFn) {
    return useCallback(async () => {
      if (queue.isReadonly) {
        showReadonly(action);
        return;
      }
      if (!confirmDangerousActions) {
        return processQueue(action, fn);
      }
      return openConfirmModal(action, fn);
    }, [action, queueId, fn]);
  }

  const handleDelete = useCallback(async function(): Promise<number> {
    if (queue.isReadonly) {
      showReadonly('delete');
      return 0;
    }
    // irrespective of confirmDangerousActions, we're going to confirm deletion
    try {
      await openConfirmDeleteModal();
      const count = await deleteQueue(queue.id);
      handleResult('delete');
      return count;
    } catch (e) {
      if (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
      return 0;
    }
  }, [queueId]);

  const pause = wrapHandler('pause', async (id: string): Promise<void> => {
    await pauseQueue(id);
  });

  const resume = wrapHandler('resume', async (id: string): Promise<void> => {
    await resumeQueue(id);
  });

  // todo: port over dialog
  const drain = wrapHandler('drain', async (id: string): Promise<void> => {
    await drainQueue(id);
  });

  const unregister = wrapHandler('unregister', async (id: string): Promise<void> => {
    await unregisterQueue(id);
  });

  return {
    pause,
    resume,
    drain,
    unregister,
    hide,
    delete: handleDelete,
  };
}
