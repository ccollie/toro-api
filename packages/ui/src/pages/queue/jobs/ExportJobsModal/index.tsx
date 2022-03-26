import { JobState } from 'src/types';
import type { JobExportOptions } from 'src/types';
import { useCallbackRef, useDisclosure } from 'src/hooks';
import ExportProgressModal from './ExportProgressModal';
import ExportOptionsModal from './ExportOptionsModal';
import React, { useState } from 'react';

interface ExporterProps {
  queueId: string;
  filter: string;
  status: JobState;
  onClose?: () => void;
}

const ExportJobsModal = (props: ExporterProps) => {
  const { queueId, filter, status } = props;
  const [isProcessing, setProcessing] = useState(false);
  const [options, setOptions] = useState<JobExportOptions | undefined>();

  const {
    isOpen: isProcessingDialogOpen,
    onClose: closeProcessingDialog,
    onOpen: openProcessingDialog,
  } = useDisclosure({
    defaultIsOpen: false,
  });

  function handleClose(): void {
    closeProcessingDialog();
    props.onClose?.();
  }

  const {
    isOpen: isExportOptionsDialogOpen,
    onClose: closeExportOptionsDialog,
  } = useDisclosure({
    defaultIsOpen: true,
  });

  const handleExport = useCallbackRef((options: JobExportOptions) => {
    closeExportOptionsDialog();
    setOptions(options);
    setProcessing(true);
    openProcessingDialog();
  });

  if (isExportOptionsDialogOpen && !isProcessing) {
    return (
      <ExportOptionsModal
        isOpen={true}
        queueId={queueId}
        onClose={handleClose}
        onConfirm={handleExport}
        status={status}
      />
    );
  }
  if (isProcessingDialogOpen && options)
    return (
      <ExportProgressModal
        queueId={queueId}
        filter={filter}
        options={options}
        onClose={closeProcessingDialog}
      />
    );
  return <></>;
};

export default ExportJobsModal;
