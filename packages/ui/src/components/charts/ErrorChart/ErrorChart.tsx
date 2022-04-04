import { stringEqual } from '@/lib';
import React from 'react';
import { AxisOptions, Chart } from 'react-charts';
import { getErrorPercentage } from '@/lib/math';

export interface ErrorDataItem {
  date: number;
  failed: number;
  completed: number;
}

interface ErrorChartProps {
  dataValue?: 'rate' | 'value';
  chartType?: 'line' | 'area' | 'bar';
  data: ErrorDataItem[];
  showXAxis?: boolean;
  showYAxis?: boolean;
  showDatumElements?: boolean;
}

export const ErrorChart: React.FC<ErrorChartProps> = props => {
  const {
    data = [],
    dataValue = 'rate',
    chartType = 'line',
    showXAxis = true,
    showYAxis = true,
    showDatumElements = true,
  } = props;


  type Series = {
    label: string;
    data: ErrorDataItem[];
  };

  function getValue(dataValue: 'rate' | 'value', data: ErrorDataItem): number {
    if (dataValue === 'value') {
      return data.failed;
    }
    const successes = data.completed - data.failed;
    return getErrorPercentage(successes, data.completed);
  }

  const primaryAxis = React.useMemo(
    (): AxisOptions<ErrorDataItem> => ({
      getValue: (datum) => new Date(datum.date),
      show: showXAxis,
    }),
    []
  );

  const secondaryAxes = React.useMemo(
    (): AxisOptions<ErrorDataItem>[] => [
      {
        getValue: (datum) => getValue(dataValue, datum),
        elementType: chartType,
        show: showYAxis,
        showDatumElements,
      },
    ],
    [dataValue]
  );

  const series = React.useMemo(
    (): Series[] => [
      {
        label: 'Failed' + (dataValue === 'rate' ? ' (%)' : ''),
        data: data,
      },
    ],
    [data, dataValue]
  );

  function EmptyChart() {
    return (
      <div className="container mx-auto align-middle ">
        <div className="empty-chart__text">No data to display</div>
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyChart />;
  }


  // todo: colors
  return (
    <Chart
      options={{
        data: series,
        primaryAxis,
        secondaryAxes,
      }}
    />
  );
};

// quick equality check for arrays of StatsSnapshot. We assume that they are sorted by time.
export function areItemsEqual(a: ErrorDataItem[], b: ErrorDataItem[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  if (a.length === 0) {
    return true;
  }

  const last = a.length - 1;
  return !(a[0].date !== b[0].date || a[last].completed !== b[last].completed);
}


function arePropsEqual(a: ErrorChartProps, b: ErrorChartProps): boolean {
  return (
    stringEqual(a.chartType, b.chartType) &&
    areItemsEqual(a.data, b.data) &&
    stringEqual(a.dataValue ?? 'value', b.dataValue ?? 'value') &&
    (a.showXAxis ?? true) === (b.showXAxis ?? true) &&
    (a.showYAxis ?? true) === (b.showYAxis ?? true) &&
    (a.showDatumElements ?? true) === (b.showDatumElements ?? true)
  );
}

export default React.memo(ErrorChart, arePropsEqual);
