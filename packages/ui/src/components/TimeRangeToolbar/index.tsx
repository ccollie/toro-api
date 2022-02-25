import { StatsGranularity } from '@/types';
import { Select, Group, ActionIcon } from '@mantine/core';
import { DatePicker, DateRangePicker } from '@mantine/dates';
// make this part of a store
import addMilliseconds from 'date-fns/addMilliseconds';
import ms from 'ms';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  endOf,
  ONE_DAY,
  ONE_HOUR,
  ONE_MONTH,
  ONE_WEEK,
  startOf,
} from '@/lib/dates';

export type RangePickerValue = [Date | null, Date | null];
export type RangeChangeHandler = (value: RangePickerValue) => void;
export type DateChangeHandler = (value: Date | null) => void;

export type RangeType = 'hour' | 'day' | 'week' | 'month' | 'custom';

export interface TimeRangeToolbarOpts {
  rangeType?: RangeType;
  range?: RangePickerValue;
  minDate?: Date;
  onRangeChange: (
    type: RangeType,
    dates: RangePickerValue,
    granularity: StatsGranularity,
  ) => void;
}

function PickerWithType({
  type,
  date,
  range,
  onDateChange,
  onRangeChange,
}: {
  type: RangeType;
  date: Date | null | undefined;
  range: RangePickerValue;
  onDateChange: DateChangeHandler;
  onRangeChange: RangeChangeHandler;
}) {
  switch (type) {
    case 'day':
      return <DatePicker defaultValue={date} onChange={onDateChange} />;
    case 'week':
      return <DatePicker defaultValue={date} onChange={onDateChange} />;
    case 'month':
      return <DatePicker defaultValue={date} onChange={onDateChange} />;
    default:
      return (
        <DateRangePicker
          defaultValue={range}
          allowLevelChange={true}
          onChange={onRangeChange}
          style={{ width: 265 }}
        />
      );
  }
}

const TimeRangeToolbar = (props: TimeRangeToolbarOpts) => {
  const [rangeType, setRangeType] = useState<RangeType>(
    (props.rangeType ?? 'hour') as RangeType,
  );
  const [range, setRange] = useState<RangePickerValue>([null, null]);
  const [dateValue, setDateValue] = useState<Date | undefined>(new Date());
  const [nextDisabled, setNextDisabled] = useState<boolean>(false);
  const [prevDisabled, setPrevDisabled] = useState<boolean>(false);
  const [custom, setCustom] = useState(false);

  function getGranularity(): StatsGranularity {
    let type = rangeType;
    if (rangeType === 'custom') {
      const [start, end] = range || [null, null];
      if (start && end) {
        const diff = Math.abs(end.getTime() - start.getTime());
        if (diff >= ONE_MONTH) {
          type = 'month';
        } else if (diff >= ONE_WEEK) {
          type = 'week';
        } else if (diff >= ONE_DAY) {
          type = 'day';
        } else if (diff >= ONE_HOUR) {
          type = 'hour';
        } else {
          type = 'hour';
        }
      }
    }
    switch (type) {
      case 'month':
        return StatsGranularity.Day;
      case 'week':
        return StatsGranularity.Hour;
      case 'day':
        return StatsGranularity.Hour;
      case 'hour':
        return StatsGranularity.Minute;
    }
    return StatsGranularity.Minute;
  }

  function emitChange() {
    const granularity = getGranularity();
    props.onRangeChange?.(rangeType, range, granularity);
  }

  function _setRange(start: Date | null, end: Date | null) {
    const [oldStart, oldEnd] = range || [null, null];
    if (props.minDate) {
      if (start && start < props.minDate) start = props.minDate;
    }
    setNextDisabled(!!end && end > new Date());
    setRange([start, end]);
    setDateValue(start ?? undefined);
    if (start !== oldStart || end !== oldEnd) {
      emitChange();
    }
  }

  function handleRangeChange(dates: RangePickerValue) {
    setRangeType('custom');
    const [start, end] = dates || [null, null];
    _setRange(start, end);
  }

  function handleDateChange(value: Date | null) {
    if (value) {
      value = startOf(value, rangeType);
      setDateValue(value);
      _setRange(value, endOf(value, rangeType));
    } else {
      _setRange(null, null);
      setDateValue(value ?? undefined);
    }
  }

  function updateRangeType(type: RangeType) {
    setRangeType(type);
    const pivot = getPivotDate();
    const start = startOf(pivot, rangeType);
    const end = endOf(pivot, rangeType);
    _setRange(start, end);
    const isCustom = !['day', 'week', 'month'].includes(rangeType);
    setCustom(isCustom);
  }

  useEffect(() => {
    updateRangeType(rangeType);
  }, [rangeType]);

  function getPivotDate(): Date {
    let pivot = new Date();
    if (range) {
      const [start, end] = range;
      if (start && end) {
        const diff = end.getTime() - start.getTime();
        pivot = addMilliseconds(start, diff / 2);
      } else {
        pivot = start || end || pivot;
      }
    }
    return pivot;
  }

  function incrementRange(direction: 'up' | 'down') {
    const interval = ms(`1 ${rangeType}`) * (direction === 'up' ? 1 : -1);
    let start = null,
      end = null;
    if (!custom) {
      // using datepicker rather than RangePicker
      start = dateValue || new Date();
    } else {
      if (range) {
        start = range[0];
        end = range[1];
      }
    }
    if (!start) {
      const pivot = getPivotDate();
      start = startOf(pivot, rangeType);
    }
    if (!end) {
      end = endOf(start, rangeType);
    }
    start = addMilliseconds(start, interval);
    end = addMilliseconds(end, interval);
    _setRange(start, end);
  }

  function next() {
    incrementRange('up');
  }

  function prev() {
    incrementRange('down');
  }

  const selectData = useMemo(() => {
    return [
      { value: 'hour', label: 'Hour' },
      { value: 'day', label: 'Day' },
      { value: 'week', label: 'Week' },
      { value: 'month', label: 'Month' },
    ];
  }, []);

  const onRangeTypeChange = useCallback(
    (value: string) => {
      updateRangeType(value as RangeType);
    },
    [updateRangeType],
  );

  return (
    <div>
      <Group>
        <Select
          value={rangeType}
          onChange={onRangeTypeChange}
          data={selectData}
        />
        <PickerWithType
          type={rangeType}
          date={dateValue}
          range={range}
          onDateChange={handleDateChange}
          onRangeChange={handleRangeChange}
        />
        <ActionIcon onClick={prev} disabled={prevDisabled}>
          <i className="la la-chevron-left" />
        </ActionIcon>
        <ActionIcon onClick={next} disabled={nextDisabled}>
          <i className="la la-chevron-right" />
        </ActionIcon>
      </Group>
    </div>
  );
};

export default TimeRangeToolbar;
