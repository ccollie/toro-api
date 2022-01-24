import { stringEqual } from '@/services';
import React from 'react';
import type { StatsSnapshot, StatsDataField } from '@/types';
import { AxisOptions, Chart } from 'react-charts';
import { defaultColorScheme } from '../common/colors';
import { isStatsSnapshotEqual } from '../common/utils';

interface StatsLineChartProps {
  fields: StatsDataField[];
  chartType?: 'line' | 'area' | 'bar' | 'bubble';
  data: StatsSnapshot[];
  colors?: string[];
  showXAxis?: boolean;
  showYAxis?: boolean;
  showDatumElements?: boolean;
}

// todo: legend
const StatsChart: React.FC<StatsLineChartProps> = (props) => {
  const {
    chartType = 'line',
    showXAxis = true,
    showYAxis = true,
    showDatumElements = true,
    colors = defaultColorScheme,
  } = props;

  type DataPoint = {
    date: Date;
    value: number;
  };

  type Series = {
    label: string;
    data: DataPoint[];
  };

  function EmptyChart() {
    return (
      <div className="container mx-auto align-middle ">
        <div className="empty-chart__text">No data to display</div>
      </div>
    );
  }

  if (props.data.length === 0) {
    return <EmptyChart />;
  }

  const primaryAxis = React.useMemo(
    (): AxisOptions<DataPoint> => ({
      getValue: (datum) => datum.date,
      show: showXAxis,
      scaleType: 'localTime',
    }),
    []
  );

  const secondaryAxes = React.useMemo(
    (): AxisOptions<DataPoint>[] => [
      {
        getValue: (datum) => datum.value,
        elementType: chartType,
        show: showYAxis,
        showDatumElements,
        scaleType: 'linear',
      },
    ],
    []
  );

  function createSeries(field: StatsDataField): Series {
    return {
      label: `${field}`,
      data: props.data.map((datum) => ({
        date: datum.endTime,
        value: datum[field],
      })),
    };
  }

  const data = React.useMemo((): Series[] => props.fields?.map(createSeries) ?? [], [props.fields]);

  return (
    <Chart
      options={{
        data,
        defaultColors: colors,
        primaryAxis,
        secondaryAxes,
      }}
    />
  );
};

function fieldsEqual(a: StatsDataField[], b: StatsDataField[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const setA = new Set(a);
  const setB = new Set(b);
  for (const field of setA) {
    if (!setB.has(field)) {
      return false;
    }
  }
  return true;
}

function arePropsEqual(a: StatsLineChartProps, b: StatsLineChartProps): boolean {
  return (
    stringEqual(a.chartType, b.chartType) &&
    fieldsEqual(a.fields, b.fields) &&
    isStatsSnapshotEqual(a.data, b.data) &&
    (a.showXAxis ?? true) === (b.showXAxis ?? true) &&
    (a.showYAxis ?? true) === (b.showYAxis ?? true) &&
    (a.showDatumElements ?? true) === (b.showDatumElements ?? true)
  );
}

export default React.memo(StatsChart, arePropsEqual);
