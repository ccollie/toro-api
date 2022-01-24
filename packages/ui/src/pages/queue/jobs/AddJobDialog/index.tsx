import { useQuery } from '@apollo/client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  GetJobOptionsSchemaDocument,
  GetJobSchemasDocument
} from '@/types';
import { DEFAULT_JOB_NAME } from 'src/constants';
import type { JobSchema } from 'src/types';
import { isEmpty, stringify } from 'src/lib';
import CodeEditor from 'src/components/CodeEditor';

import { RetryIcon } from '@/components/Icons';
import { useToast } from '@/hooks';
import JobNamesSelect from 'src/components/jobs/JobNamesSelect';
import { createJob } from 'src/services';
import { Button, Drawer, Group, LoadingOverlay, Space, Text } from '@mantine/core';

interface AddJobDialogOpts {
  queueId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AddJobDialog: React.FC<AddJobDialogOpts> = props => {
  const { queueId, isOpen, onClose } = props;
  const [isSaving, setIsSaving] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);
  const [jobName, setJobName] = useState<string | null>(null);
  const [schemas, setSchemas] = useState<JobSchema[]>([]);
  const [jobSchema, setJobSchema] = useState<JobSchema>();
  const [jobData, setJobData] = useState<Record<string, unknown>>({});
  const [jobOptions, setJobOptions] = useState<Record<string, unknown>>({});
  const [isChanged, setChanged] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [jobOptionsSchema, setJobOptionsSchema] =
    useState<Record<string, unknown>>();
  const [schemaString, setSchemaString] = useState<string>('{}');
  const [optionsString, setOptionsString] = useState<string>('{}');

  const toast = useToast();

  const { loading: optionsLoading } = useQuery(GetJobOptionsSchemaDocument, {
    fetchPolicy: 'cache-first',
    onCompleted(data) {
      setJobOptionsSchema(data.jobOptionsSchema);
    },
  });

  const { loading: schemaLoading } = useQuery(GetJobSchemasDocument, {
    variables: { queueId },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    onCompleted(data) {
      setSchemas(data?.queue?.jobSchemas ?? []);
    },
  });

  useEffect(() => {
    let schema, defaultOpts: Record<string, unknown> | null | undefined;
    if (jobSchema) {
      schema = jobSchema.schema;
      defaultOpts = jobSchema.defaultOpts;
    }
    setSchemaString(schema ? stringify(schema) : '{}');
    setOptionsString(defaultOpts ? stringify(defaultOpts) : '{}');
  }, [jobSchema]);

  useEffect(() => {
    const found = schemas.find(x => x.jobName === jobName);
    if (found) {
      setJobSchema(found);
    } else {
      setJobSchema(undefined);
    }
  }, [jobName, schemas]);

  useEffect(() => {
    const valid = !!jobName && !isEmpty(jobData); // review this. I think it's reasonable to allow empty job data
    // todo: validate job data against schema and validate job options
    setIsValid(valid);
  }, [jobData, jobName]);

  const handleJobNameChange = useCallback(function (jobNames: string[]): void {
    const jobName = jobNames.length ? jobNames[0] : null;
    setJobName(jobName);
    // setIsNewItem(!found);
  }, []);

  function saveJob(): void {
    const keys = Object.keys(jobData);
    if (keys.length > 0) {
      setIsSaving(true);
      createJob(
        queueId,
        jobName || DEFAULT_JOB_NAME,
        jobData,
        jobOptions,
      )
        .then((job) => {
          const { id, name } = job;
          const descr = `Job ${name}:(${id}) created`;
          setIsSaving(false);
          toast.success(descr);
        }).catch((err) => {
          const msg = (err instanceof Error) ? err.message : err;
          setIsSaving(false);
          toast.error(msg);
        })
        .finally(() => {
          setIsSaving(false);
        });
    }
  }

  function revertJob() {
    setJobData({});
  }

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

  const onJobUpdate = useCallback((value: string) => {
    console.log('Job updated ...', value);
    setJobData(toObj(value));
  }, []);

  const onOptionsUpdate = useCallback((value: string) => {
    setJobOptions(toObj(value));
  }, []);

  function handleClose() {
    onClose();
  }

  return (
    <>
      <Drawer
        size={520}
        onClose={onClose}
        opened={isOpen}
        position={'right'}
        padding="md"
        title="Add A Job"
      >
        <div>
          <LoadingOverlay visible={isSaving} />

          <JobNamesSelect
            label={'Job Name'}
            queueId={queueId}
            isClearable={true}
            selected={jobName || ''}
            onChange={handleJobNameChange}
            isMulti={false}
            placeholder="Please select or enter a job name"
          />
          <Space h="md" />
          <Text>Job Data</Text>

          <CodeEditor
            height="250px"
            width="100%"
            readOnly={schemaLoading}
            value={schemaString}
            language={'json'}
            onChange={onJobUpdate}
          />

          <Space h="md" />
          <Text>Job Options</Text>
          <CodeEditor
            height="250px"
            width="100%"
            readOnly={optionsLoading}
            value={optionsString}
            language={'json'}
            onChange={onOptionsUpdate}
          />

        </div>

        <Space h="md" />

        <div style={{ textAlign: 'right' }}>
          <Group position="right" spacing="sm">
            <Button
              onClick={saveJob}
              loading={isSaving}
              disabled={!isValid}>
              Save
            </Button>
            <Button
              leftIcon={<RetryIcon />}
              disabled={!isNewItem}
              onClick={revertJob}>
              Revert
            </Button>
          </Group>
        </div>

        <div
          style={{
            textAlign: 'right',
          }}>
          <Button onClick={handleClose} style={{ marginRight: 8 }}>
            Close
          </Button>
        </div>
      </Drawer>
    </>
  );
};

export default AddJobDialog;
