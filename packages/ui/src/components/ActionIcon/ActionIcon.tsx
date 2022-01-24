import { Tooltip } from '@mantine/core';
import React, { ReactNode, useRef } from 'react';
import { useAsync, useToast, useUnmountEffect } from '@/hooks';
import { LoadingIcon } from '@/components/Icons/Loading';
import { PopConfirm } from 'src/components/PopConfirm';

type MessageContent = ReactNode | (() => ReactNode);

interface ActionIconProps {
  className?: string;
  baseIcon: ReactNode;
  disabled?: boolean;
  confirmPrompt?: MessageContent;
  okText?: string;
  cancelText?: string;
  successMessage?: MessageContent;
  errorMessage?: MessageContent | false;
  title?: ReactNode;
  handler: () => void | Promise<void>;
  danger?: boolean;
}

function ActionIcon(props: ActionIconProps) {
  const {
    handler = noop,
    baseIcon,
    confirmPrompt,
    disabled = false,
    title,
    successMessage,
    errorMessage = false,
  } = props;
  const { execute, error, loading } = useAsync(handler);
  const mountedRef = useRef(true);

  const toast = useToast();

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async function noop() {}

  useUnmountEffect(() => {
    mountedRef.current = false;
  });

  const showMessage = (success: boolean, err?: Error) => {
    if (!mountedRef.current) return;
    if (success) {
      if (successMessage) {
        setTimeout(() => toast.success(showMessage), 0);
      }
    } else {
      if (!errorMessage) return;
      let msg = errorMessage;
      if (!msg) {
        if (err) {
          // todo: getErrorText
          msg = err.message;
        }
      } else {
        msg = 'Error completing operation';
      }
      msg && setTimeout(() => toast.error(msg), 0);
    }
  };

  async function handleClick() {
    if (disabled) return;
    if (!loading) {
      return execute()
        .then(() => {
          showMessage(true);
        })
        .catch((err) => {
          showMessage(false, err);
        });
    }
  }

  function base(onClick = handleClick) {
    const style = {
      cursor: 'pointer',
      ...(disabled ? { opacity: '25%' } : {}),
    };

    const render = () => (
      <span onClick={onClick} style={style}>
        {baseIcon}
      </span>
    );
    if (title) {
      return (
      <Tooltip withArrow label={title}>
        {render()}
      </Tooltip>
      );
    }
    return render();
  }

  if (loading) return <LoadingIcon />;
  if (error) {
    // TODO: Style
    return base();
  }
  if (confirmPrompt) {
    const { okText = 'Yes', cancelText = 'Cancel' } = props;
    return (
      <PopConfirm
        trigger={base()}
        title={confirmPrompt}
        onConfirm={handleClick}
        confirmText={okText}
        cancelText={cancelText}
      />
    );
  }
  return base();
}

export default ActionIcon;
