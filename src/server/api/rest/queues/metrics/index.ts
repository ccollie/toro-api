const router = require('express').Router({ mergeParams: true });
import metricsHandler from './metrics';
import lastItemHandler from './last';
import rangeHandler from './range';

const MetricTypes = 'latency|wait|throughput';

router.get(`/:metric(${MetricTypes})`, metricsHandler);
router.get(`/:metric(${MetricTypes})/last/:type(snapshot)?`, lastItemHandler);
router.get(`/:metric(${MetricTypes})/range`, rangeHandler);

export default router;
