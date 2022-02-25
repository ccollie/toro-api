import React from 'react';
import {
  Axis,
  Chart,
  LineSeries,
  niceTimeFormatByDay,
  ScaleType,
  timeFormatter,
} from '@elastic/charts';
import { dateFormatAliases, formatDate } from '@elastic/eui';
import { ThemedChartSettings } from '@/components';
import { TimeseriesDataPoint } from '@/types';

interface MetricChartOpts {
  data: TimeseriesDataPoint[];
}

export const MetricChart: React.FC<MetricChartOpts> = props => {
  const { data } = props;
  const xDomain = {
    minInterval: 60000,
  };

  return (
    <Chart size={{ height: 200 }}>
      <ThemedChartSettings showLegend={false} xDomain={xDomain} />
      <LineSeries
        id="financial"
        name="Metric"
        data={data}
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor="ts"
        yAccessors={['value']}
      />
      <Axis
        title={formatDate(Date.now(), dateFormatAliases.date)}
        id="bottom-axis"
        position="bottom"
        tickFormat={timeFormatter(niceTimeFormatByDay(1))}
      />
      <Axis id="left-axis" position="left" showGridLines />
    </Chart>
  );
};
