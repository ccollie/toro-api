import { Button, Group, Modal, Progress, Text, TextInput } from '@mantine/core';
import React, { ChangeEvent, useEffect } from 'react';
import { TrashIcon } from 'src/components/Icons';
import { isValidJobIdPattern } from 'src/services';

interface DeletePatternDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (pattern: string) => Promise<void>;
}

export const DeletePatternDialog = (props: DeletePatternDialogProps) => {
  const [pattern, setPattern] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  function handleDelete() {
    setLoading(true);
    props.onDelete(pattern)
      .then(handleClose)
      .catch((err: Error) => {
        const msg = err.message || `${err}`;
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function validate() {
    if (pattern.length > 0) {
      if (!isValidJobIdPattern(pattern)) {
        setError('Invalid pattern');
      } else {
        setError('');
      }
    } else {
      setError('');
    }
  }

  useEffect(validate, [pattern]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const val = (event.target.value ?? '').trim();
    setPattern(val);
  }

  function handleClose() {
    props?.onClose();
  }

  return (
      <Modal
        opened={props.isOpen}
        centered={true}
        withCloseButton
        onClose={handleClose}
        size="lg"
        shadow="md"
        radius="md"
        title={<Text size="lg">Delete By Pattern</Text>}
      >
        <Group align="flex-end">
          <TextInput
            error={error}
            placeholder="Pattern"
            style={{ flex: 1 }}
            onChange={handleChange} />
          <Group spacing={3}>
            <Button
              variant="default"
              onClick={handleClose}>
              Cancel
            </Button>
            <Button
              disabled={loading || !pattern?.length}
              leftIcon={<TrashIcon />}
              loading={loading}
              onClick={handleDelete}>
              Delete
            </Button>
          </Group>
        </Group>
        {loading &&
          <Progress
            value={100}
            striped={true}
            animate={true}
            style={{ marginTop: '1rem' }}
          />
        }
      </Modal>
  );
};
