import { Job, JobFragment, useUpdateJobMutation } from '@/types';
import React, { useState, useEffect } from 'react';
import { Modal, Group, Button } from '@mantine/core';
import CodeEditor from 'src/components/CodeEditor';
import { useQueue, useToast } from 'src/hooks';
import { JsonService } from 'src/services';

type UpdateJobDataDialogProps = {
  isOpen: boolean;
  queueId: string;
  job: Job | JobFragment;
  onChange: (v: Job | JobFragment) => void;
  onClose?: () => void;
};

const EditDataModal = (props: UpdateJobDataDialogProps) => {
  const { isOpen, onClose, job } = props;
  const { queue } = useQueue(props.queueId);
  const toast = useToast();
  const rawString = job.data ? JsonService.maybeStringify(job.data) : '{}';
  const [initValue, setInitValue] = useState(JsonService.format(rawString));
  const [dataValue, setDataValue] = useState<string>(initValue);
  const [isValid, setValid] = useState(false);

  const title = `Update Job - ${job.name}#${job.id}`;

  useEffect(() => {
    setDataValue(initValue);
    try {
      JSON.parse(dataValue);
      setValid(true);
    } catch (e) {
      setValid(false);
    }
  }, [dataValue]);

  function handleClose() {
    onClose?.();
  }

  const [updateJobData, { loading: saving }] = useUpdateJobMutation({
    onCompleted: (data) => {
      const updatedJob = data.updateJob;
      if (updatedJob) {
        // todo: properly set in store
        job.data = updatedJob.data;
        toast.success(`Job ${updatedJob.id} updated`);
        handleClose();
      }
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  useEffect(() => {
    if (props.isOpen) {
      // onOpen();
    } else {
      handleClose();
    }
  }, [props.isOpen]);

  const handleSave = () => {
    const jobData = JSON.parse(dataValue);
    updateJobData({
      variables: {
        queueId: props.queueId,
        jobId: job.id,
        data: jobData
      }
    });
  };

  const formatValue = () => {
    try {
      const formatted = JsonService.format(dataValue);
      setDataValue(formatted);
      setInitValue(formatted);
    } catch (e) {
      // do nothing
    }
  };

  return (
    <Modal
      title={title}
      onClose={handleClose}
      opened={isOpen}
      size={580}
      centered>
      <form>
        <CodeEditor
          height="280px"
          width="100%"
          language="json"
          readOnly={queue.isReadonly}
          value={initValue}
          onChange={setDataValue}
        />
        <div>
          <Group position="apart" mt="xl">
            <Button type="button" onClick={handleClose} ml="auto">
              Cancel
            </Button>
            <Button
              disabled={!isValid}
              onClick={formatValue}>
              Format
            </Button>
            <Button
              type="submit"
              disabled={!isValid}
              loading={saving}
              onClick={handleSave}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Group>
        </div>
      </form>
    </Modal>
  );
};

export default EditDataModal;
