import { useSetState } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import React, { useCallback, useEffect,  useState } from 'react';
import type { Queue } from '@/types';
import { useDisclosure } from '@/hooks';
import { Modal, Button, Group, Text, TextInput } from '@mantine/core';

type DeleteQueueProps = {
  queue: Queue;
  onDeleted?: (queue?: Queue) => void;
  onDelete: (queueId?: string) => Promise<void>;
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
};

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
        Are you sure you want to delete the queue &quot;{queue.name}&quot;?
      </h4>
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

  const openDeleteModal = () => {

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

  return <Button onClick={openDeleteModal} color="red">Delete account</Button>;
}


export const DeleteQueueDialog: React.FC<DeleteQueueProps> = (props) => {
  const { queue, onDeleted, onDelete } = props;
  const [canDelete, setCanDelete] = useState(false);
  const [queueName, setQueueName] = useState('');
  const [fieldClass, setFieldClass] = useState<string | undefined>();

  const { isOpen, onClose } = useDisclosure({
    isOpen: !!props.isOpen,
  });

  function handleClose() {
    props.onClose && props.onClose();
    onClose();
  }

  function handleInputChange(e: React.FormEvent<HTMLInputElement>) {
    const newValue = e.currentTarget.value;
    setQueueName(newValue);
  }

  const handleDelete = () => {
    Promise.resolve(onDelete(queue.id))
      .then(() => {
        onDeleted && onDeleted(queue);
      })
      .finally(handleClose)
  };

  useEffect(() => {
    let clazz: string | undefined = undefined;
    const isValid = queueName === queue.name;
    setCanDelete(isValid);

    if (queueName) {
      if (isValid) {
        clazz = 'border-red-500'
      } else {
        clazz = 'border-red-500'
      }
    } else {
      clazz = 'border-gray-500'
    }
    setFieldClass(clazz)
  }, [queueName]);

  return (
    <Modal title="Delete Queue" opened={isOpen} onClose={handleClose}>
      <h4>
        Are you sure you want to delete the queue &quot;{queue.name}&quot;?
      </h4>
      <p>
        This action cannot be undone.
      </p>
        <div>
          <TextInput
            id="name"
            name="name"
            type="text"
            label="Enter Queue Name"
            placeholder="Enter the queue name to confirm deletion"
            value=""
            onChange={handleInputChange}
            required={true}
            className={`w-full py-2 pr-2 pl-12 ${fieldClass}`}/>

          {(queueName && !canDelete) && (
            <span className="flex items-center font-medium tracking-wide text-red-500 text-xs mt-1 ml-1">
			        Queue names do not match !
		        </span>
          )}

        </div>
      <div>
        <Group>
          <Button
            onClick={handleClose}
            className="mr-2">
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            className="bg-red-500 text-white">
            Delete
          </Button>
        </Group>
      </div>
    </Modal>
  );
};

export default DeleteQueueDialog;
