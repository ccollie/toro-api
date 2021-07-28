import { onStatsUpdated } from '../../stats/onStatsUpdated';
import { FieldConfig } from '../../index';

export const onQueueStatsUpdated: FieldConfig = onStatsUpdated(false);
