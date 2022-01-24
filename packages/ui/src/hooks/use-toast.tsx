import { NotificationProps } from '@mantine/notifications/lib/types';
import { CheckIcon, Cross1Icon, ExclamationTriangleIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import React from 'react';
import { useNotifications } from '@mantine/notifications';

export type ToastContent = React.ReactNode | ((props: NotificationProps) => React.ReactNode);

export const useToast = () => {
  const { showNotification, hideNotification } = useNotifications();

  function notify(options: NotificationProps): string {
    return showNotification(options);
  }

  function success(content: ToastContent, options?: Partial<NotificationProps>): string  {
    return showNotification({
      color: 'teal',
      icon: <CheckIcon />,
      message: content,
      ...(options || {}),
    });
  }

  function error(content: ToastContent, options?: Partial<NotificationProps>): string {
    return showNotification({
      color: 'red',
      icon: <Cross1Icon />,
      message: content,
      disallowClose: true,
      ...(options || {}),
    });
  }

  function info(content: ToastContent, options?: Partial<NotificationProps>): string {
    return showNotification({
      color: 'blue',
      icon: <InfoCircledIcon />,
      message: content,
      ...(options || {}),
    });
  }

  function warn(content: ToastContent, options?: Partial<NotificationProps>): string {
    return showNotification({
      color: 'yellow',
      icon: <ExclamationTriangleIcon />,
      message: content,
      ...(options || {}),
    });
  }

  return {
    notify,
    success,
    error,
    info,
    warn,
    dismiss: hideNotification
  };
};


