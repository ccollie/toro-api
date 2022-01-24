import { useSetState } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import React, { useCallback, useEffect,  useState } from 'react';
import type { Queue } from '@/types';
import { Text, TextInput } from '@mantine/core';

type ConfirmProps = {
  queue: Queue;
  onNameMatch: (isMatch: boolean) => void;
};

const ConfirmationForm: React.FC<ConfirmProps>  = (props) => {
  const { queue } = props;
  const [canDelete, setCanDelete] = useState(false);
  const [queueName, setQueueName] = useState('');
  const [error, setError] = useState('');

  function handleInputChange(e: React.FormEvent<HTMLInputElement>) {
    const newValue = e.currentTarget.value;
    setQueueName(newValue);
  }

  useEffect(() => {
    const isValid = queueName === queue.name;
    setCanDelete(isValid);

    if (queueName && !isValid) {
      setError('Queue name does not match');
    } else {
      setError('');
    }
  }, [queueName]);

  useEffect(() => {
    props.onNameMatch && props.onNameMatch(canDelete);
  }, [canDelete]);

  return (
    <>
      <h4>
        Are you sure you want to delete the queue?
      </h4>
      <Text>
        {queue.name}
      </Text>
      <Text size="sm">
        To confirm, please enter the name of the queue below.
      </Text>
      <p>
        This action cannot be undone.
      </p>
      <div>
        <TextInput
          id="name"
          name="name"
          label="Enter Queue Name"
          placeholder="Enter the queue name to confirm deletion"
          onChange={handleInputChange}
          required={true}
          error={error}
          className={`w-full py-2`}/>
      </div>
    </>
  )
}


export function useQueueDeleteConfirmModal(queue: Queue) {
  const modals = useModals();
  const [confirmProps, setConfirmProps] = useSetState({  color: 'red', disabled: true });

  const onNameMatch = useCallback((isMatch: boolean) => {
    setConfirmProps({ disabled: !isMatch });
  }, []);

  const openConfirmDeleteModal = () => {

    return new Promise<void>((resolve, reject) => {
      function close(id: string, fn: () => void) {
        modals.closeModal(id);
        fn();
      }

      const id = modals.openConfirmModal({
        title: 'Delete Queue',
        centered: true,
        children: (
          <ConfirmationForm queue={queue} onNameMatch={onNameMatch}/>
        ),
        labels: {confirm: 'Delete Queue', cancel: "Close"},
        confirmProps,
        onCancel: () => {
          close(id, reject);
        },
        onConfirm: () => {
          close(id, resolve);
        }
      });
    })
  };

  return {
    openConfirmDeleteModal
  }
}
