// Modified from https://github.com/selvagsz/react-async-button
import React, { ReactChild, ReactNode } from 'react';
import classNames from 'clsx';
import { useAsync, AsyncState } from '@/hooks';

export type AsyncClickFn = (...args: any[]) => void | Promise<void>;

export interface AsyncButtonProps {
  className?: string;
  loadingClass?: string;
  fulFilledClass?: string;
  rejectedClass?: string;
  text?: string;
  pendingText?: string;
  fulFilledText?: string;
  rejectedText?: string;
  disabled?: boolean;
  icon?: ReactChild;
  onClick?: AsyncClickFn;
}

export const AsyncButton: React.FC<AsyncButtonProps> = props => {
  const { execute, status } = useAsync(async function () {
    props.onClick && await props.onClick();
  });

  const {
    children,
    text,
    icon,
    pendingText,
    fulFilledText,
    rejectedText,
    className = '',
    loadingClass = 'AsyncButton--loading',
    fulFilledClass = 'AsyncButton--fulfilled',
    rejectedClass = 'AsyncButton--rejected',
    disabled: _disabled,
    ...attributes
  } = props;

  const isPending = status === AsyncState.PENDING;
  const isFulfilled = status === AsyncState.SUCCESS;
  const isRejected = status === AsyncState.ERROR;
  const isDisabled = _disabled || isPending;
  let buttonText: ReactNode;

  if (isPending) {
    buttonText = pendingText;
  } else if (isFulfilled) {
    buttonText = fulFilledText;
  } else if (isRejected) {
    buttonText = rejectedText;
  }
  buttonText = buttonText || text || 'Confirm';

  return (
    <button
      {...attributes}
      className={classNames(className, {
        [loadingClass]: isPending,
        [fulFilledClass]: isFulfilled,
        [rejectedClass]: isRejected,
      })}
      disabled={isDisabled}
      onClick={(event: any) => execute(event)}>
      {(icon && !isPending) && <span className="mr-3">{icon}</span>}
      {isPending && <span className="mr-3"><i className="i-fa-circle-notch animate-spin"/></span>}
      {typeof children === 'function'
        ? children({
            buttonText,
            isPending,
            isFulfilled,
            isRejected,
          })
        : children || buttonText}
    </button>
  );
};

export default AsyncButton;
