import { useModals } from '@mantine/modals';
import { Space } from '@mantine/core';
import React, { ReactNode } from 'react';

export interface ConfirmOptions {
  title?: ReactNode;
  description?: ReactNode;
  variant?: 'success' | 'warning' | 'danger';
  confirmText?: string;
  cancelText?: string;
  body?: ReactNode;
  onConfirm?: () => Promise<void> | void;
}

export interface ConfirmApi {
  openConfirm: (opts?: ConfirmOptions) => Promise<void>;
}

export function useConfirm(): ConfirmApi {
  const modals = useModals();

  function openConfirm(opts?: ConfirmOptions) {
    const {
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      description,
      body,
      title = 'Are you sure?',
    } = {
      ...(opts || {})
    };

    return new Promise<void>((resolve, reject) => {
      // eslint-disable-next-line prefer-const
      let id: string;

      function finish(confirmed: boolean) {
        modals.closeModal(id);
        if (confirmed) {
          resolve();
        } else {
          reject();
        }
      }

      id = modals.openConfirmModal({
        title,
        centered: true,
        children: (
          <>
            {!!description && (
              <>
                <div>
                  {description}
                </div>
                <Space h="md" />
              </>
            )}
            {!!body && <div style={{ marginTop: '5px' }}>{body}</div>}
          </>
        ),
        labels: { confirm: confirmText, cancel: cancelText },
        confirmProps: { color: 'red' },
        onCancel: () => finish(false),
        onConfirm: () => finish(true),
      });
    });
  }

  return {
    openConfirm,
  };
}
