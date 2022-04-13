import { Center, Text } from '@mantine/core';
import { DataItem } from 'src/components/charts/common/models';
import { JobState } from '@/types';
import { arePropsEqual, Colors, PieChartDataProps } from './utils';
import React, { useEffect, useState } from 'react';
import DonutChart from '../Donut';
import { AdvancedLegend, AdvancedLegendProps } from '../AdvancedLegend/Legend';

type TData = {
  name: string;
  value: number;
  percent?: number;
};

interface TProps extends PieChartDataProps {
  legend?: 'advanced' | undefined;
}

interface LegendProps extends AdvancedLegendProps {
  data: TData[];
  colors: string[];
}

function Legend( { colors, data, ...props }: LegendProps ) {
  const [legendData, setLegendData] = useState<DataItem[]>([]);

  useEffect(() => {
    setLegendData(data.map((item, index) => ({
      color: colors[index],
      title: item.name,
      name: item.name,
      value: item.value,
    })));
  }, [colors, data]);

  return (
    <AdvancedLegend colors={colors} data={legendData} {...props}/>
  );
}

export const JobCountsPieChart: React.FC<TProps> = (props) => {
  const { height = 450 } = props;
  const [data, setData] = useState<TData[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [title, setTitle] = useState<string | undefined>(props.title);
  const [colors, setColors] = useState<string[]>([]);

  function updateDataInStore() {
    const data: TData[] = [];
    const colors: string[] = [];
    const { __typename, ...counts } = props.counts;
    let total = 0;
    Object.entries(counts).forEach(([status, value]) => {
      const val = value ?? 0;
      data.push({
        name: status,
        value: val,
      });
      colors.push(Colors[status as JobState]);
      total += val;
    });
    data.forEach((item) => {
      item.percent = (item.value / total) * 100;
    });
    const centerText = props.title ? props.title : `Total\n${total}`;
    setData(data);
    setTotal(total);
    setColors(colors);
    setTitle(centerText);
  }

  useEffect(updateDataInStore, [props.counts]);

  function Chart() {
    return (
      <div
        style={{
          textAlign: 'center',
          cursor: 'pointer',
          fontFamily: 'sans-serif',
          height: `${height}px`,
        }}
      >
      <DonutChart
        size={height}
        title={title}
        data={data}
        colors={colors}
        onHover={(i: number) => {
          if (i>=0) {
            console.log('Selected ', data[i].name);
          } else {
            console.log('Mouse left donut');
          }
        }}
        activeOffset={0.3}
      />
      </div>
    );
  }

  return (
    <div>
      {total ? (
        (props.legend === 'advanced') ? (
          <div className="flex-row">
            <div className="flex-1">
              <Chart/>
            </div>
            <Legend colors={colors} data={data}/>
          </div>
        ) : (
          <Chart />
        )
      ) : (
        <Center className="items-center" style={{ height: height }}>
          <Text size="lg" color="dimmed" align="center">No Jobs Available</Text>
        </Center>
      )}
    </div>
  );
};

export default React.memo(JobCountsPieChart, arePropsEqual);
