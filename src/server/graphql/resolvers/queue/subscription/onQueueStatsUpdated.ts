import { onStatsUpdated } from '../../stats/onStatsUpdated';
import { FieldConfig } from '../../';

export const onQueueStatsUpdated: FieldConfig = onStatsUpdated(false);
