import React, { ChangeEvent, useEffect, useState } from 'react';
import type { JobFilter } from 'src/types';
import { Button, Group, Modal, TextInput } from '@mantine/core';
import { useToast } from 'src/hooks';
import { useQueueJobFilters } from 'src/services';

interface QuerySaveDialogProps {
  isOpen?: boolean;
  title?: string;
  queueId: string;
  name?: string;
  expression: string;
  validateName: (name: string) => boolean;
  onCreated: (filter: JobFilter) => void;
  onClose: () => void;
}

const QuerySaveDialog = (props : QuerySaveDialogProps) => {
  const { title = 'Save Query', queueId, expression, isOpen } = props;
  const [name, setName] = useState(props.name ?? '');
  const [error, setError] = useState<string>();
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const { createFilter } = useQueueJobFilters(queueId);

  async function create() {
    if (name && expression) {
      setLoading(true);
      try {
        const createdFilter = await createFilter(name, expression);
        props.onCreated(createdFilter);
        // todo: close
        props.onClose();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : `${e}`;
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }
  }

  const handleOk = () => {
    create().catch(console.log);
  };

  const handleCancel = () => {
    props.onClose?.();
  };

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
  }

  useEffect(() => {
    setIsValid(props.validateName(name));
  }, [name]);

  return (
    <Modal opened={!!isOpen} onClose={handleCancel} title={title}>
      <TextInput
        label={'Query Name'}
        placeholder="Query Name"
        className="w-full"
        onChange={handleChange}/>
      {error && <div className="text-red-500">{error}</div>}
      <Group position="right" mt={3}>
        <Button onClick={handleCancel} variant="default">
          Cancel
        </Button>
        <Button disabled={!isValid || loading} onClick={handleOk} loading={loading}>
          Save
        </Button>
      </Group>
    </Modal>
  );
};

export default QuerySaveDialog;
