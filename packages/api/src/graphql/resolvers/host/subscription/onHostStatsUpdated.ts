import { onStatsUpdated } from '../../stats/onStatsUpdated';
import { FieldConfig } from '../../index';

export const onHostStatsUpdated: FieldConfig = onStatsUpdated(true);
