import { JobStatus } from '@/types';
import { useMantineTheme } from '@mantine/core';

let palette: Record<JobStatus, string>;

export const useJobStatusesPalette = () => {
  const theme = useMantineTheme();

  if (!palette) {
    palette = {
      [JobStatus.Failed]: theme.colors.red[5],
      [JobStatus.Completed]: theme.colors.green[5],
      [JobStatus.Delayed]: theme.colors.blue[8],
      [JobStatus.Waiting]: theme.colors.indigo[5],
      [JobStatus.Paused]: theme.colors.grey[6],
      [JobStatus.Active]: theme.colors.cyan[5],
      [JobStatus.Unknown]: theme.colors.yellow[4],
      [JobStatus.WaitingChildren]: theme.colors.orange[0],
      // [JobStatus.Stuck]: theme.colors.grey[4],
    };
  }

  return palette;
}
export const useJobStatusColor = (status: JobStatus): string => {
  return palette[status];
};
