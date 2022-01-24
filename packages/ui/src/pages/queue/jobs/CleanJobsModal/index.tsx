import React, { useState, useEffect } from 'react';
import type { Status } from '@/types';
import { ucFirst } from '@/lib';
import { parseDuration } from '@/lib/dates';
import ms from 'ms';
import { ClockIcon } from '@radix-ui/react-icons';
import { NumberInput, TextInput, Checkbox, Modal, Group, Button } from '@mantine/core';

type CleanJobsDialogProps = {
  max?: number;
  isOpen: boolean;
  status: Status;
  onCleanJobs: (status: Status, grace: number, limit?: number) => Promise<void>;
  onClose?: () => void;
};

const DEFAULT_GRACE_PERIOD = ms('5 secs');

const CleanJobsModal = (props: CleanJobsDialogProps) => {
  const [isPending, setIsPending] = useState(false);
  const [canClean, setCanClean] = useState(true);
  const [deleteAll, setDeleteAll] = useState(false);
  const [limit, setLimit] = useState(props.max ?? 1000);
  const [gracePeriod, setGracePeriod] = useState(DEFAULT_GRACE_PERIOD);
  const [graceText, setGraceText] = useState<string>();
  const [isGracePeriodValid, setGracePeriodValid] = useState(true);

  const DurationError = 'Duration must be a number or time expression';

  useEffect(() => {
    let valid = true;
    if (graceText) {
      const duration = parseDuration(graceText);
      if (isNaN(duration)) {
        valid = false;
      } else {
        setGracePeriod(duration);
      }
    } else {
      setGraceText('');
    }
    setGracePeriodValid(valid);
  }, [graceText]);

  function handleClose() {
    props.onClose && props.onClose();
  }

  function handleClean(): void {
    setIsPending(true);
    Promise.resolve(props.onCleanJobs(props.status, gracePeriod, limit)).finally(() => {
      setIsPending(false);
      handleClose();
    });
  }

  const onCheckboxChange = (e: { target: { checked: boolean } }) => {
    setDeleteAll(e.target.checked);
  };

  useEffect(() => {
    if (props.isOpen) {
      // onOpen();
    } else {
      handleClose();
    }
  }, [props.isOpen]);

  const onLimitChange = (value: number) => {
    if (Number.isNaN(value)) {
      return;
    }
    setLimit(value);
    // triggerChange({ number: newNumber });
  };

  function onGracePeriodChange(e: React.FormEvent<HTMLInputElement>) {
    const fieldValue = e.currentTarget.value;
    const newNumber = parseInt(fieldValue || '0', 10);
    if (Number.isNaN(newNumber)) {
      setCanClean(false);
      return;
    }
    setCanClean(true);
    setGracePeriod(newNumber);
  }

  const type = ucFirst(props.status);

  return (
    <Modal title={`Clean ${type} Jobs`} onClose={handleClose} opened={props.isOpen}>
      <p>Clean {type} jobs? You can&lsquo;t undo this action afterwards.</p>
      <form>
        <TextInput
          label={`Grace Period`}
          name="grace"
          mt="md"
          icon={<ClockIcon />}
          invalid={!isGracePeriodValid}
          error={!isGracePeriodValid ? DurationError : undefined}
          disabled={deleteAll}
          placeholder="Enter a number (millis) or expression like '5 mins'"
          description={`The grace period is the amount of time to wait before deleting jobs.`}
          onChange={onGracePeriodChange}
        />
        <NumberInput
          label={`Limit`}
          defaultValue={1000}
          min={1}
          mt="md"
          mb="md"
          description={`The max number of jobs to delete.`}
          disabled={deleteAll}
          onChange={onLimitChange}
        />
        <div>
          <Checkbox
            id="delete-all"
            checked={deleteAll}
            label={`Clear all ${type} jobs`}
            onChange={onCheckboxChange}
          />
        </div>
        <div>
          <Group position="apart" mt="xl">
            <Button type="button" color="gray" onClick={handleClose} ml="auto">
              Cancel
            </Button>
            <Button
              color="blue"
              type="submit"
              disabled={!canClean}
              loading={isPending}
              onClick={handleClean}
            >
              {isPending ? 'Cleaning...' : 'Clean'}
            </Button>
          </Group>
        </div>
      </form>
    </Modal>
  );
};

export default CleanJobsModal;
