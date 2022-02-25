import { DefaultTimeWindows, ONE_MINUTE } from './constants';
import prettyMilliseconds from 'pretty-ms';
import React, { useMemo } from 'react';
import { MantineSize, Select, SelectItem } from '@mantine/core';

export interface TimeWindowSelectProps {
  defaultValue?: number;
  value?: number;
  verbose?: boolean;
  width?: MantineSize;
  onChange?: (value: number) => void;
  label?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const EmptyHandler = () => {};

export const TimeWindowSelect = (props : TimeWindowSelectProps) => {
  const {
    defaultValue = ONE_MINUTE,
    onChange = EmptyHandler,
    value,
    verbose = true,
    label,
    width,
    ...rest
  } = props;

  function handleChange(value: string | null): void {
    let val = value === null ? defaultValue : Number(value);
    if (isNaN(val)) val = defaultValue;
    onChange(val);
  }

  const options = useMemo(
    () =>
      DefaultTimeWindows.map(value => {
        return {
          value: `${value}`,
          label: prettyMilliseconds(value, { verbose })
        } as SelectItem;
      }),
    [verbose]
  );

  return (
    <Select
      label={label}
      value={`${value}`}
      defaultValue={`${defaultValue}`}
      onChange={handleChange}
      data={options}
      {...rest}
    />
  );
};

export default TimeWindowSelect;
