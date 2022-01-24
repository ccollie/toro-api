import type { JobCounts, JobStatus } from 'src/types';

export type OnPieClickCallback = (status: JobStatus, value?: number) => void;

export type JobCountsHash = {
  [key in JobStatus]: number;
};

export type PieChartDataProps = {
  height?: number;
  title?: string;
  counts: JobCounts;
  onClick?: OnPieClickCallback;
};

export const Colors: Record<JobStatus, string> = {
  waiting: 'hsl(32, 70%, 50%)',
  active: 'hsl(22, 70%, 50%)',
  completed: 'hsl(132, 70%, 50%)',
  failed: 'hsl(345, 70%, 50%)',
  paused: 'hsl(345, 70%, 50%)',
  delayed: 'hsl(292, 70%, 50%)',
  unknown: 'hsl(0,7%,67%)',
  waiting_children: 'hsl(191,70%,50%)', // not used currently
};

export interface DataPoint {
  status: string;
  value: number;
  color?: string;
}

export function normalizeData(props: PieChartDataProps): DataPoint[] {
  const data: DataPoint[] = [];
  const {__typename, ...counts } = props.counts;
  Object.entries(counts).forEach(([status, value]) => {
    const color = Colors[status as JobStatus];
    data.push({
      status,
      value: value ?? 0, //ts couldn't infer this
      color,
    });
  });
  return data;
}

export function arePropsEqual(
  a: PieChartDataProps,
  b: PieChartDataProps,
): boolean {
  if (a.height !== b.height) return false;
  if (a.onClick !== b.onClick) return false;
  const keys = Object.keys(Colors);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if ((a.counts as any)[k] !== (b.counts as any)[k]) return false;
  }
  return true;
}
