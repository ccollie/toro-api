import type { JobExportOptions } from 'src/types';
import { DownloadProgressEvent, useJobDownloads } from 'src/hooks/use-job-downloads';
import { toPrecision } from 'src/lib';
import { CheckIcon } from '@radix-ui/react-icons';
import React, { useEffect, useRef, useState, Fragment } from 'react';
import { useToast, useUnmountEffect } from 'src/hooks';
import EmptyState from 'src/components/EmptyState';
import { Button, Center, Modal, RingProgress, Text, ThemeIcon } from '@mantine/core';
import { ExportIcon } from 'src/components/Icons/ExportIcon';

interface ExportProgressProps {
  queueId: string;
  filter: string;
  options: JobExportOptions;
  onClose?: () => void;
}

export const ExportProgressModal: React.FC<ExportProgressProps> = (props) => {
  const { queueId, filter } = props;
  const [visible, setVisible] = useState(true);
  const [isProcessing, setProcessing] = useState(true);
  const [isDone, setIsDone] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(0);
  const [options] = useState<JobExportOptions>(props.options);
  const updateStatus = useRef<DownloadProgressEvent>({
    current: 0,
    isCancelled: false,
    isDone: false,
    progress: 0,
    total: 0,
  });

  const toast = useToast();

  function progressHandler(evt: DownloadProgressEvent) {
    if (!updateStatus.current) {
      updateStatus.current = evt;
    } else {
      Object.assign(updateStatus.current, { ...evt });
    }
    const progress = parseFloat(toPrecision(evt.progress, 1));
    setProgress(progress);
    setIsDone(evt.isDone);
    setCurrent(evt.current);
    setTotal(evt.total);
    setIsCancelled(evt.isCancelled);
    setProcessing(!isDone && !isCancelled);
  }

  const { start: startDownload, stop: stopDownload } = useJobDownloads({
    queueId,
    filter,
    onProgress: progressHandler,
  });

  function handleCancel(): void {
    stopDownload();
    setProcessing(false);
    setIsCancelled(true);
  }

  function handleClose(): void {
    if (isProcessing) {
      handleCancel();
    } else {
      props.onClose?.();
    }
  }

  useUnmountEffect(() => {
    if (isProcessing) {
      stopDownload();
    }
  });

  function ProgressForm() {
    return (
      <EmptyState
        icon={<ExportIcon />}
        title={
          <span className="text-sm">
            Processing {current} of {total} jobs.
          </span>
        }
        actions={
          <Button size="sm" color="primary" onClick={handleCancel} fullWidth>
            Cancel
          </Button>
        }
      >
        <Fragment>
          <h3>Exporting Jobs</h3>
          <p style={{ height: '240px' }}>
            <RingProgress
              size={240}
              sections={[{ value: progress, color: 'blue' }]}
              label={
                <Center>
                  {progress > 98 ? (
                    <ThemeIcon color="teal" variant="light" radius="xl" size="xl">
                      <CheckIcon style={{ height: 22, width: 22 }} />
                    </ThemeIcon>
                  ) : (
                    <Text color="blue" weight={700} align="center" size="xl">
                      {progress}%
                    </Text>
                  )}
                </Center>
              }
            />
          </p>
        </Fragment>
      </EmptyState>
    );
  }

  function CancelledResult() {
    return (
      <EmptyState
        icon={<ExportIcon />}
        title={<span>Export Cancelled</span>}
        actions={[
          <Button key="close-btn" onClick={handleClose}>
            Close
          </Button>,
        ]}
      />
    );
  }

  useEffect(() => {
    if (visible) {
      startDownload(options).catch(console.log);
    }
    return stopDownload;
  }, [visible]);

  useEffect(() => {
    if (isDone) {
      // hack
      setIsCancelled(false);
      handleClose();
      setVisible(false);
      toast.success(`${current} jobs exported to "${options.filename}"`);
    }
  }, [isDone]);

  return (
    <Modal opened={true} onClose={handleClose}>
      <Center>
        {isProcessing && <ProgressForm key="progress-form" />}
        {isCancelled && <CancelledResult key="cancel-result" />}
      </Center>
    </Modal>
  );
};

export default ExportProgressModal;
