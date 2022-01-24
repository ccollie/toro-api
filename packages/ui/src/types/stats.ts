import { StatsSnapshot } from './generated';

type StatsData = Omit<StatsSnapshot, '__typename' | 'startTime' | 'endTime'>;

export type StatsDataField = keyof StatsData;
