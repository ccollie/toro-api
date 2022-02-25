import {
  type AggregateInfo,
  AggregateTypeEnum,
  useGetAvailableAggregatesQuery,
} from '@/types';
import React, { useEffect, useState } from 'react';
import { Select, SelectItem } from '@mantine/core';
import { LoadingIcon } from 'src/components/Icons';

type AggregateSelectProps = {
  verbose?: boolean;
  onAggregateSelect: (value: AggregateTypeEnum) => void;
  defaultValue?: AggregateTypeEnum;
  style?: React.CSSProperties;
  className?: string;
};

const AggregateSelect = (props: AggregateSelectProps) => {
  const {
    verbose,
    onAggregateSelect,
    defaultValue = AggregateTypeEnum.Mean,
    ...rest
  } = props;

  const [options, setOptions] = useState<SelectItem[]>([]);
  const [selected, setSelected] = useState<AggregateTypeEnum>(defaultValue);
  const { loading, data } = useGetAvailableAggregatesQuery();

  function createOption(val: AggregateInfo): SelectItem {
    let label: string;
    if (val.type === AggregateTypeEnum.None) {
      label = 'value';
    } else {
      label = verbose ? val.description : val.type;
    }

    return {
      value: val.type,
      label,
      inputDisplay: `${val.type}`,
    };
  }

  function handleChange(value: AggregateTypeEnum): void {
    setSelected(value);
    onAggregateSelect && onAggregateSelect(value);
  }

  useEffect(() => {
    if (data && !loading) {
      const aggregates = (data.aggregates || []) as AggregateInfo[];
      setOptions(aggregates.map(createOption));
    }
  }, [loading, data]);

  return (
    <Select
      id="aggregate"
      icon={loading && <LoadingIcon />}
      data={options}
      value={selected}
      defaultValue={defaultValue}
      onChange={handleChange}
      {...rest}
    />
  );
};

export default AggregateSelect;
