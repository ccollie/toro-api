import { type MetricInfo, MetricType, useGetAvailableMetricsQuery } from '@/types';
import { Select, type SelectItem } from '@mantine/core';
import React, { useState, useEffect, ReactNode } from 'react';
import { LoadingIcon } from 'src/components/Icons';

interface MetricSelectProps {
  verbose?: boolean;
  onChange?: (type: MetricType, info: MetricInfo) => void;
  defaultValue?: MetricType;
  label?: ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const MetricTypeSelect = (props: MetricSelectProps) => {
  const {
    verbose,
    onChange,
    defaultValue = MetricType.Latency,
    label,
    ...rest
  } = props;

  const [metrics, setMetrics] = useState<MetricInfo[]>([]);
  const [selected, setSelected] = useState<MetricType>(defaultValue);
  const [options, setOptions] = useState<SelectItem[]>([]);

  const { loading, data } = useGetAvailableMetricsQuery();

  function createOption(val: MetricInfo): SelectItem {
    return {
      value: val.type,
      label: val.description ?? `${val.type}`,
    };
  }

  useEffect(() => {
    if (data && !loading) {
      const items = (data.availableMetrics || []) as MetricInfo[];
      setMetrics(items);
      setOptions(items.map(createOption));
      if (defaultValue) {
        const found = items.find(x => x.type == defaultValue);
        found && setSelected(found.type);
      }
    }
  }, [data, loading, defaultValue]);

  function onMetricChange(value: MetricType): void {
    const info = metrics.find(x => x.type === value) ?? undefined;
    if (info) {
      setSelected(value);
      onChange?.(value, info);
    }
  }

  return (
    <Select
      style={{ minWidth: '120px' }}
      {...rest}
      onChange={onMetricChange}
      data={options}
      value={selected}
      // defaultValue={defaultValue}
      icon={loading && <LoadingIcon />}
      searchable
    />
  );
};

export default MetricTypeSelect;
