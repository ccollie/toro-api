import React from 'react';
import { formatDate } from 'src/lib';
import { Breakpoint, Metric, MetricFragment } from 'src/types';
import { MetricActions } from '../MetricActions';

export type MetricColumnType = {
  title: string;
  dataIndex?: keyof MetricFragment;
  width?: string | number;
  render?: (record: Metric | MetricFragment) => React.ReactNode;
  ellipsis?: boolean;
  align?: 'left' | 'right' | 'center' | 'justify';
  fixed?: 'left' | 'right';
  className?: string;
  responsive?: Array<Breakpoint>;
};

export function Header({ column }: { column: MetricColumnType }) {
  return (
    <th
      scope="col"
      className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
    >
      <div className="flex items-center justify-between">{column.title}</div>
    </th>
  );
}

export function Cell({
  metric,
  column,
}: {
  metric: Metric | MetricFragment;
  column: MetricColumnType;
}) {
  const { dataIndex, render, align = 'left', className = '', width } = column;
  return (
    <td className={`p-4 whitespace-no-wrap ${className}`} style={{ width }}>
      <span style={{ textAlign: align }} className={className}>
        {render ? render(metric) : dataIndex ? metric[dataIndex] : null}
      </span>
    </td>
  );
}

export const MetricsColumns: MetricColumnType[] = [
  {
    render: (x) => x.id,
    title: 'Id',
  },
  {
    render: (x) => x.name,
    title: 'Name',
  },
  {
    render: (x) => x.description,
    title: 'Description',
  },
  {
    title: 'Created',
    render: (metric) => formatDate(metric.createdAt),
  },
  {
    title: 'Active',
    render: (metric) => {
      return metric.isActive ? <i className="i-la-toggle-on" /> : <i className="i-la-toggle-off" />;
    },
  },
  {
    title: 'Actions',
    render: (m: Metric | MetricFragment) => {
      return <MetricActions queueId={m.queueId} metric={m} />;
    },
  },
];
