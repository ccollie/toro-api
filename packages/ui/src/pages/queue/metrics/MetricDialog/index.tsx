import {
  AggregateTypeEnum,
  GetQueueMetricsDocument,
  MetricCategory,
  MetricType,
  useCreateMetricMutation,
  useUpdateMetricMutation,
} from '@/types';
import type {
  Metric,
  MetricInfo,
  MetricInput,
  MetricFragment,
} from '@/types';
import { TimeWindowSelect } from '@/components/TimeWindowSelect';
import { useDisclosure, useToast } from '@/hooks';
import JobNamesSelect from 'src/components/jobs/JobNamesSelect';
import { ONE_MINUTE } from './constants';
import { GraphQLError } from 'graphql';
import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import AggregateSelect from './AggregateSelect';
import MetricTypeSelect from './MetricTypeSelect';
import { isSlidingWindowAggregate } from './utils';
import {
  Button,
  TextInput,
  Group,
  Drawer,
  Space,
  Switch,
  Textarea,
  Title,
} from '@mantine/core';

const EmptyMetricInput: MetricInput = {
  aggregator: {
    type: AggregateTypeEnum.Mean,
    options: {},
  },
  isActive: false,
  name: '',
  options: {},
  queueId: '',
  id: '-1',
  type: MetricType.Latency,
};

interface AddMetricDialogProps {
  isOpen: boolean;
  queueId: string;
  metric?: Metric | MetricFragment;
  onCreated?: (metric: Metric) => void;
  onUpdated?: (metric: Metric) => void;
  onClose: () => void;
}

export const MetricDialog = (props: AddMetricDialogProps) => {
  const { queueId } = props;
  const { onOpen, onClose } = useDisclosure();
  const [isNew, setIsNew] = useState(true);
  const [metricInfo, setMetricInfo] = useState<MetricInfo | null>();
  const [timeWindow, setTimeWindow] = useState<number>(ONE_MINUTE);
  const [isSlidingWindow, setSlidingWindow] = useState(false);
  const [jobNames, setJobNames] = useState<string[]>([]);
  const input = useRef<MetricInput>(metricToInput(props.metric));
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState<string>('');

  const [saveMetric] = useUpdateMetricMutation();
  const [createMetric] = useCreateMetricMutation();

  const toast = useToast();
  const DEFAULT_SAMPLE_INTERVAL = 60000; // 1minute. Todo: get from config

  const refetchProps = {
    refetchQueries: [
      { query: GetQueueMetricsDocument, variables: { id: queueId } },
    ],
    awaitRefetchQueries: true,
  };

  function updateAndClose(m: Metric) {
    setLoading(false);
    if (isNew) {
      props.onCreated?.(m);
    } else {
      props.onUpdated?.(m);
    }
    props.onClose();
    const msg = `${isNew ? 'Created' : 'Updated'} metric "${m.name}"`;
    toast.success(msg);
  }

  function handleSaveResult(
    err: GraphQLError | undefined,
    m: Metric | undefined
  ) {
    if (err) {
      // use
      const msg = err.message;
      toast.error(msg);
    } else {
      m && updateAndClose(m);
    }
  }

  function handleUpdate() {
    const {
      id,
      queueId,
      name,
      description,
      aggregator,
      type,
      options,
      isActive,
    } = input.current;
    setLoading(true);
    saveMetric({
      variables: {
        input: {
          id,
          queueId,
          name,
          description,
          aggregator,
          type,
          options,
          isActive,
        },
        ...refetchProps,
      },
    })
      .then(r => {
        const err = r.errors?.[0];
        const m = r.data?.updateMetric as Metric;
        handleSaveResult(err, m);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function handleCreate() {
    const {
      queueId,
      name = '',
      description,
      aggregator,
      type,
      options = {},
      isActive,
    } = input.current;
    setLoading(true);
    createMetric({
      variables: {
        input: {
          queueId,
          name: name ?? '',
          description,
          aggregator,
          type,
          options: options ?? {},
          isActive,
        },
        ...refetchProps,
      },
    })
      .then(r => {
        const m = r.data?.createMetric as Metric;
        const err = r.errors?.[0];
        if (err) {
          return toast.error(err.message);
        } else {
          updateAndClose(m);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function handleSubmit() {
    const id = input.current.id ?? '-1';
    if (id === '-1') {
      return handleCreate();
    } else {
      return handleUpdate();
    }
  }

  function metricToInput(
    metric: Metric | MetricFragment | undefined
  ): MetricInput {
    if (!metric) {
      return {
        ...EmptyMetricInput,
        queueId: queueId,
      };
    }
    return {
      id: metric.id ?? '-1',
      aggregator: { ...metric.aggregator },
      isActive: metric.isActive,
      name: metric.name,
      description: metric.description,
      options: { ...metric.options },
      queueId: queueId,
      type: metric.type,
      sampleInterval: metric.sampleInterval,
    };
  }

  function updateValid() {
    const v = input.current;
    const valid =
      !!(v.name && v.name.length > 2) &&
      !!(v.queueId && v.type && v.aggregator?.type);
    setIsValid(valid);
  }

  useEffect(() => {
    const curr = input.current;
    const type = curr.aggregator?.type ?? AggregateTypeEnum.Mean;
    setSlidingWindow(isSlidingWindowAggregate(type));
    if (isSlidingWindow) {
      const { duration: d } = curr.aggregator?.options ?? {
        duration: ONE_MINUTE,
      };
      const duration = parseInt(`${d}`, 10);
      setTimeWindow(isNaN(duration) ? duration : ONE_MINUTE);
    }
    const names = (curr.options ?? {})['jobNames'];
    if (Array.isArray(names)) {
      setJobNames(names);
    } else {
      setJobNames([]);
    }
  }, [props.metric?.type]);

  function handleClose() {
    onClose();
    props?.onClose();
  }

  useEffect(() => {
    if (props.isOpen) {
      onOpen();
    } else {
      handleClose();
    }
  }, [props.isOpen]);

  useEffect(() => {
    const _input = metricToInput(props.metric);
    Object.assign(input.current, _input);
    const newMetric = ['', '-1', null].includes(_input?.id);
    updateValid();
    setIsNew(newMetric);
    const title = newMetric
      ? 'Create A Metric'
      : `Edit metric "${_input.name}"`;
    setTitle(title);
  }, [props.metric]);

  const inputStyle = { width: '100%' };

  function onNameChange(e: ChangeEvent<HTMLInputElement>) {
    input.current.name = e.target.value;
    updateValid();
  }

  function onDescriptionChange(e: ChangeEvent<HTMLTextAreaElement>) {
    input.current.description = e.target.value;
  }

  function onMetricTypeChange(type: MetricType, info: MetricInfo): void {
    input.current.type = type;
    setMetricInfo(info);
    updateValid();
  }

  function onTimeWindowChange(value: number) {
    const curr = input.current;
    curr.aggregator = curr.aggregator || {
      type: AggregateTypeEnum.Mean,
      options: {},
    };
    curr.aggregator.options = {
      duration: value,
    };
    setTimeWindow(value);
    updateValid();
  }

  function onSampleIntervalChange(value: number) {
    const curr = input.current;
    curr.options = {
      ...curr.options,
      sampleInterval: value,
    };
    updateValid();
  }

  function onAggregateChange(value: AggregateTypeEnum) {
    const curr = input.current;
    curr.aggregator = curr.aggregator || {
      type: AggregateTypeEnum.Mean,
      options: {},
    };
    curr.aggregator.type = value;
    updateValid();
  }

  function onJobNamesSelected(values: string[]): void {
    const current = input.current;
    setJobNames(values);
    current.options = { ...current.options, jobNames: values };
  }

  function onActiveChange(e: ChangeEvent<HTMLInputElement>) {
    input.current.isActive = e.target.checked;
  }

  return (
    <>
      <Drawer onClose={handleClose} opened>
        <div>
          <Title>
            <h2 id="flyoutTitle">{title}</h2>
          </Title>
        </div>
        <div>
          <TextInput
            id="name"
            label="Name"
            required={true}
            invalid={!input.current.name}
            placeholder="Metric name"
            defaultValue={input.current.name ?? ''}
            onChange={onNameChange}
            style={inputStyle}
          />
          {!(input.current.name && input.current.name.length > 2) && (
            <span>
                  Name must be at least 3 characters
                </span>
          )}
          <Textarea
            id="description"
            label="Description"
            placeholder="Description"
            defaultValue={input.current.description ?? undefined}
            style={inputStyle}
            onChange={onDescriptionChange}
          />
          <Space h="md" />
          <Group>
            <div>
              <MetricTypeSelect
                onChange={onMetricTypeChange}
                defaultValue={input.current.type}
              />
            </div>
            <div>
              <AggregateSelect
                style={{ maxWidth: 185 }}
                onAggregateSelect={onAggregateChange}
                defaultValue={input.current.aggregator?.type}
              />
            </div>
          </Group>
          {isSlidingWindow && (
            <TimeWindowSelect
              label="Sliding Window"
              defaultValue={timeWindow}
              verbose={true}
              onChange={onTimeWindowChange}
            />
          )}
          {metricInfo?.category === MetricCategory.Queue && (
            <>
              <Space h="md" />
              <JobNamesSelect
                label="Job Names"
                queueId={queueId}
                selected={jobNames}
                onChange={onJobNamesSelected}
                style={{ width: '100%' }}
              />
            </>
          )}
          <Space h="md" />
          <TimeWindowSelect
            label="Sample Interval"
            defaultValue={DEFAULT_SAMPLE_INTERVAL}
            verbose={true}
            onChange={onSampleIntervalChange}
          />
          <Space h="md" />
          <div>
            <Switch
              checked={input.current.isActive}
              onChange={onActiveChange}
              label="Active"
            />
          </div>
        </div>
        <div>
          <div
            style={{
              textAlign: 'right',
            }}>
            <Button variant="default" onClick={handleClose} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button
              disabled={!isValid}
              loading={loading}
              onClick={handleSubmit}
              variant="filled">
              Submit
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default MetricDialog;
