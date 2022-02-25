import { TypedDocumentNode, useMutation } from '@apollo/client';
import { OperationVariables } from '@apollo/client/core';
import { DocumentNode } from 'graphql';
import React, { ReactNode, useCallback, useState } from 'react';
import { ActionIcon, ActionIconProps } from '@mantine/core';

interface MutationIconProps<TData = any, TVariables = OperationVariables>
  extends Omit<ActionIconProps<any>, 'onClick' | 'disabled'> {
  idempotent?: boolean;
  icon?: ReactNode;
  isDisabled?: boolean;
  mutation: DocumentNode | TypedDocumentNode<TData, TVariables>;
  variables?: () => TVariables;
  onSuccess?: (data: TData) => void;
  onError?: (err: Error) => void;
}

export function MutationIcon<TData = any, TVariables = OperationVariables>(
  props: MutationIconProps<TData, TVariables> & { children?: React.ReactNode }
) {
  const {
    mutation,
    variables,
    isDisabled: _disabled,
    idempotent = false,
    onSuccess,
    onError,
    icon,
    children,
    ...rest
  } = props;

  const [disabled, setDisabled] = useState(_disabled);
  const [execute, { called, loading }] = useMutation<TData, TVariables>(mutation,{
    variables: getVariables(),
    onCompleted(data) {
      onSuccess?.(data);
    },
    onError(err) {
      onError?.(err);
    },
  });

  function getVariables(): TVariables | undefined {
    let vars: TVariables | undefined = undefined;
    if (variables !== undefined) {
      if (typeof variables === 'function') {
        vars = variables();
      } else {
        vars = variables;
      }
    }
    return vars;
  }

  const handler = useCallback(async () => {
    if (called && idempotent) {
      setDisabled(true);
      return Promise.resolve();
    }
    await execute();
  }, [called, idempotent]);

  function Icon() {
    if (icon) {
      return <span>{icon}</span>;
    }
    return <></>;
  }

  return (
    <ActionIcon
      disabled={disabled}
      onClick={handler}
      loading={loading}
      {...rest}>
      <Icon/>
    </ActionIcon>
  );
}

export default MutationIcon;
