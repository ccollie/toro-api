import { useDisclosure, useToast } from 'src/hooks';
import React, { ReactNode, useCallback, useState } from 'react';
import s from './styles.module.css';
import { Button, Group, Popover } from '@mantine/core';

interface ConfirmProps {
  open?: boolean;
  onCancel?: () => void;
  onConfirm: () => void | Promise<void>;
  title?: ReactNode;
  trigger: ReactNode;
  description?: ReactNode;
  variant?: 'success' | 'warning' | 'danger';
  confirmText?: ReactNode;
  cancelText?: ReactNode;
  isValid?: boolean | (() => boolean);
}

export const PopConfirm: React.FC<ConfirmProps> = (props) => {
  const {
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    title = 'Are you sure?',
    isValid = true,
    description = '',
    trigger,
  } = props;

  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const { isOpen, onClose } = useDisclosure({ defaultIsOpen: !!props.open });

  const onConfirm = useCallback(async () => {
    setLoading(true);
    try {
      await props.onConfirm();
    } catch (e) {
      const msg = (e as any).message || e;
      toast.error(msg);
    }
    setLoading(false);
  }, [props.onConfirm]);

  const onCancel = useCallback(() => {
    props.onCancel?.();
  }, [props.onCancel]);

  const validate = useCallback(() => {
    if (!isValid) {
      return true;
    }
    return typeof isValid === 'function' ? isValid() : isValid;
  }, [isValid]);

  return (
    <Popover withArrow opened={isOpen} onClose={onClose} target={trigger}>
      <div>
        <div>
          <h3>{title}</h3>
        </div>
        {!!description && <div className="mt-4 mb-4">{description}</div>}
        {props.children && <div className="mb-4">{props.children}</div>}
        <div className={s.actions}>
          <Group position="right" spacing="sm">
            <Button
              color="primary"
              disabled={!validate() || loading}
              onClick={onConfirm}
              loading={loading}
            >
              {confirmText}
            </Button>
            <Button color="basic" onClick={onCancel}>
              {cancelText}
            </Button>
          </Group>
        </div>
      </div>
    </Popover>
  );
};
