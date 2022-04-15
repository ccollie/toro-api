import React, { ChangeEvent, useEffect, useState } from 'react';
import type {
  JobExportFormat,
  JobExportOptions,
  JobSearchStatus,
} from 'src/types';
import {
  Group,
  Checkbox,
  Modal,
  Space,
  Text,
  TextInput,
  NumberInput,
  SegmentedControl,
  Button, Box,
} from '@mantine/core';
import { FieldList, AllFieldNames } from './FieldList';

interface ExportOptionsProps {
  queueId: string;
  status: JobSearchStatus;
  filter?: string;
  isOpen: boolean;
  onConfirm: (evt: JobExportOptions) => void;
  onClose?: () => void;
}

export const ExportOptionsModal = (props: ExportOptionsProps) => {
  const { status, filter, isOpen } = props;
  const [format, setFormat] = useState<JobExportFormat>('json');
  const [filename, setFilename] = useState<string>('');
  const [selectedFields, setSelectedFields] = useState<string[]>(AllFieldNames);
  const [exportAll, setExportAll] = useState(true);
  const [exportSelected, setExportSelected] = useState(false);
  const [canExport, setCanExport] = useState(false);
  const [includeHeaders, setIncludeHeaders] = useState(false);
  const [maxJobs, setMaxJobs] = useState(100);

  useEffect(() => {
    const exportable = !!(
      !!selectedFields.length &&
      filename &&
      !!filename.length &&
      (exportAll || maxJobs > 0) &&
      !!format
    );
    setCanExport(exportable);
  }, [selectedFields, exportAll, maxJobs, filename]);

  useEffect(() => {
    if (exportAll) setExportSelected(false);
  }, [exportAll]);

  function onFilenameChange(evt: ChangeEvent<HTMLInputElement>) {
    setFilename(evt.target.value);
  }

  function onChangeFormat(format: string) {
    setFormat(format as JobExportFormat);
  }

  function onMaxChange(max: number) {
    if (!Number.isNaN(max)) setMaxJobs(max);
  }

  function onExportAllChange(evt: ChangeEvent<HTMLInputElement>) {
    const checked = evt.target.checked;
    setExportAll(checked);
    if (checked) setExportSelected(false);
  }

  function onExportSelectedChange(evt: ChangeEvent<HTMLInputElement>) {
    setExportSelected(evt.target.checked);
  }

  function onIncludeHeadersChange(evt: ChangeEvent<HTMLInputElement>) {
    setIncludeHeaders(evt.target.checked);
  }

  function handleClose(): void {
    props.onClose?.();
  }

  function handleOk(): void {
    const options: JobExportOptions = {
      fields: selectedFields,
      filename,
      status,
      format,
      filter,
      maxJobs: exportAll ? undefined : maxJobs,
    };
    props.onConfirm?.(options);
  }

  function handleSelectionChange(ids: string[]) {
    setSelectedFields(ids);
    console.log('Selected Rows: ', ids);
  }

  return (
    <Modal
      centered
      opened={isOpen}
      title="Export Jobs"
      size="lg"
      onClose={handleClose}
    >
      <form name="export-jobs-modal">
        <TextInput
          style={{ width: '100%' }}
          label="Filename"
          required={true}
          placeholder="Enter file name"
          error={!filename && 'Missing filename'}
          onChange={onFilenameChange}
        />
        <div>
          <h3>Format</h3>
          <SegmentedControl
            fullWidth
            data={[
              { label: 'JSON', value: 'json' },
              { label: 'CSV', value: 'csv' },
            ]}
            value={format}
            onChange={onChangeFormat}
          />
          <div>
            {format === 'csv' && (
              <div>
                <Space h="sm" />
                <Checkbox
                  onChange={onIncludeHeadersChange}
                  disabled={format !== 'csv'}
                  checked={includeHeaders}
                  mt={4}
                  id="csv-headers-cbx"
                  label="Include Headers"
                />
              </div>
            )}
          </div>
        </div>
        <Space h="md" />
        <Box sx={{ height: 230 }}>
          <Text>Select Fields to Export</Text>
          <FieldList onChange={handleSelectionChange} />
        </Box>
        <Space h="md" />
        <Group align="center" grow={false}>
          <Checkbox
            id="export-all-check"
            label="Export All"
            onChange={onExportAllChange}
            checked={exportAll}
          />
          <Checkbox
            id="export-selected-check"
            label="Export Selected"
            onChange={onExportSelectedChange}
            checked={exportSelected}
          />
          <div>
            <Group spacing="sm" align="center" grow={false} position="apart">
              <span>Max Jobs</span>
              <NumberInput
                min={10}
                max={1000}
                defaultValue={100}
                onChange={onMaxChange}
                style={{ width: '95px' }}
                disabled={exportAll || exportSelected}
              />
            </Group>
          </div>
        </Group>

        <div>
          <Group position="apart" mt="xl">
            <Button variant="default" onClick={handleClose} ml="auto">
              Cancel
            </Button>
            <Button disabled={!canExport} onClick={handleOk} type="submit">
              Export
            </Button>
          </Group>
        </div>
      </form>
    </Modal>
  );
};

export default ExportOptionsModal;
