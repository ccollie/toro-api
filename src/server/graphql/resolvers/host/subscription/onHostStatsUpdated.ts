import { onStatsUpdated } from '../../stats/onStatsUpdated';
import { FieldConfig } from '../../';

export const onHostStatsUpdated: FieldConfig = onStatsUpdated(true);
