export interface RepeatableJob {
  key: string;
  name: string;
  id: string | null;
  endDate: number | null;
  tz: string | null;
  cron: string;
  next: number;
  descr: string;
}
