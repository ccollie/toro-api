import { TrashIcon, RetryIcon } from 'src/components/Icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { JobSchema } from 'src/types';
import { isEqual, isEmptyObject, isObject } from '@/lib';
import CodeEditor from '@/components/CodeEditor';
import JobNamesSelect from '@/components/jobs/JobNamesSelect';
import { Button, Drawer, Group, Space } from '@mantine/core';
import { useToast } from '@/hooks';
import { JsonService, setJobSchema, useJobSchemaActions } from '@/services';

interface JobSchemaModalOpts {
  queueId: string;
  isOpen?: boolean;
  onClose: () => void;
}

export const JobSchemaModal = (props: JobSchemaModalOpts) => {
  const { queueId, onClose, isOpen = false } = props;
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);
  const [jobName, setJobName] = useState<string | null>(null);
  const [schema, setSchema] = useState<JobSchema>();
  const [editSchema, setEditSchema] = useState<JobSchema>();
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [isLoadingNames, setIsLoadingNames] = useState(false);
  const [isInferring, setIsInferring] = useState(false);
  const [isInferError, setIsInferError] = useState(false);
  const [isChanged, setChanged] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [jobOptionsSchema, setJobOptionsSchema] =
    useState<Record<string, any>>();
  const [schemaString, setSchemaString] = useState<string>('{}');
  const [optionsString, setOptionsString] = useState<string>('{}');

  const newJobNames = useRef<Set<string>>(new Set());

  const actions = useJobSchemaActions(queueId);
  const toast = useToast();

  useEffect(() => {
    setIsLoadingNames(true);
    actions.getJobOptionsSchema()
      .then(setJobOptionsSchema)
      .finally(() => setIsLoadingNames(false));
  }, [queueId]);

  function setSchemaState(editSchema: JobSchema | undefined | null) {
    let schema, defaultOpts: Record<string, any> | null | undefined;
    if (editSchema) {
      schema = editSchema.schema;
      defaultOpts = editSchema.defaultOpts;
    }
    setSchema(editSchema ?? undefined);
    setSchemaString(formatValue(schema ?? '{}'));
    setOptionsString(formatValue(defaultOpts ?? '{}'));
  }

  const handleClose = useCallback(() => {
    onClose && onClose();
  }, [onClose]);

  function loadSchema(jobName: string) {
    setIsLoadingSchema(true);
    actions
      .getSchema(jobName)
      .then(setSchemaState)
      .finally(() => {
        setIsLoadingSchema(false);
      });
    // todo: handle error
  }

  function handleJobNameChange(values: string[]): void {
    const name = values.length && values[0];
    if (!name) {
      setJobName(null);
      setEditSchema(undefined);
      setSchema(undefined);
      return;
    }
    // todo: capture onCreate on jobNameSelect
    const isNew = newJobNames.current.has(name);
    setJobName(name);
    setIsNewItem(isNew);
    if (!isNew) loadSchema(name);
    setIsInferError(false);
  }

  function saveSchema(): void {
    if (editSchema) {
      setIsSaving(true);
      setJobSchema(
        queueId,
        jobName!,
        editSchema.schema!,
        editSchema.defaultOpts!,
      )
        .then((schema) => {
          setSchema(schema);
          setEditSchema(schema);
        })
        .finally(() => setIsSaving(false));
    }
  }

  function inferSchema(): void {
    // todo: warn if schema is changed
    if (jobName) {
      setIsInferring(true);
      actions
        .inferSchema(jobName!)
        .then(setSchemaState)
        .catch((err) => {
          const msg = (err instanceof Error) ? err.message : `${err}`;
          toast.warn(msg);
          setIsInferError(true);
        })
        .finally(() => setIsInferring(false));
    }
  }

  function handleDeleteSchema() {
    if (schema && jobName) {
      setIsDeleting(true);
      actions
        .deleteSchema(jobName)
        .then(() => {
          setSchema(undefined);
        })
        .finally(() => {
          setIsDeleting(false);
        });
    }
  }

  function revertSchema() {
    jobName && loadSchema(jobName);
  }

  function updateEditable(value: Partial<JobSchema>) {
    setEditSchema({
      ...(editSchema || {}),
      ...value,
      jobName: value?.jobName ?? jobName ?? '',
    });
    setChanged(isEqual(editSchema, schema));
    if (isEmptyObject(editSchema?.schema) && isEmptyObject(editSchema?.defaultOpts)) {
      // todo: error message if not new
      setIsValid(false);
    }
  }

  const onSchemaUpdate = useCallback((value: string) => {
    const schema = toObj(value);
    updateEditable({ schema });
  }, []);

  const onOptionsUpdate = useCallback((value: string) => {
    const defaultOpts = toObj(value);
    updateEditable({ defaultOpts });
  }, []);

  const onJobNameCreated = useCallback((name: string) => {
    newJobNames.current.add(name);
    setJobName(name);
    setIsNewItem(true);
    setIsValid(false);
  }, []);

  return (
    <>
      <Drawer
        title="Job Schemas"
        size={720}
        onClose={handleClose}
        opened={isOpen}
        position="right"
        padding="md"
      >
        <form>
          <JobNamesSelect
            label="Job Name"
            isMulti={false}
            selected={jobName || ''}
            onChange={handleJobNameChange}
            onCreated={onJobNameCreated}
            placeholder="Please select or enter a job name"
            disabled={isLoadingNames}
            queueId={queueId}
          />
          <Space h="lg" />
          <span>Schema</span>
          <CodeEditor
            height="250px"
            width="100%"
            readOnly={isLoadingSchema}
            value={schemaString}
            onChange={onSchemaUpdate}
          />
          <Space h="lg" />
          <span>Job Options</span>
          <CodeEditor
            height="250px"
            width="100%"
            readOnly={isLoadingSchema}
            value={optionsString}
            onChange={onOptionsUpdate}
          />
          <div style={{ textAlign: 'right' }}>
            <Space h="lg" />
            <Group spacing={5} position="right">
              <Button
                color={isInferError ? 'red' : undefined}
                onClick={inferSchema}
                loading={isInferring}
                disabled={!jobName}
              >
                Infer Schema
              </Button>
              <Button
                onClick={saveSchema}
                loading={isSaving}
                disabled={!isChanged || !isValid}
              >
                Save
              </Button>
              <Button
                disabled={!isNewItem}
                onClick={revertSchema}
                leftIcon={<RetryIcon />}
              >
                Revert
              </Button>
              <Button
                loading={isDeleting}
                onClick={handleDeleteSchema}
                leftIcon={<TrashIcon />}
                disabled={!isNewItem}
              >
                Delete
              </Button>
            </Group>
          </div>
        </form>
      </Drawer>
    </>
  );
};

function toObj(value: string | null | undefined): Record<string, unknown> {
  if (value) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return {};
    }
  }
  return Object.create(null);
}

function formatValue(value?: string | null | Record<string, any>): string {
  if (isObject(value)) {
    return JsonService.maybeStringify(value);
  }
  return JsonService.maybeStringify(JsonService.maybeParse(value));
}

export default JobSchemaModal;
