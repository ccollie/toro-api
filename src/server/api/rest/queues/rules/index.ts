const router = require('express').Router({ mergeParams: true });

import { list } from './list';
import { createRule } from './createRule';

import { deactivate } from './deactivate';
import { activate } from './activate';
import { getRule } from './getRule';

import { getAlerts } from './alerts';
import { clearAlerts } from './clearAlerts';
import { getAlert } from './getAlert';
import { deleteAlert } from './deleteAlert';

router.get('/', list);

router.post('/:id', createRule);
router.get('/:id', getRule);
router.delete('/:id', clearAlerts);

router.post('/:id/activate', activate);
router.post('/:id/deactivate', deactivate);

router.get('/:id/alerts', getAlerts);
router.get('/:id/alerts/:alertId', getAlert);
router.delete('/:id/alerts/:alertId', deleteAlert);
router.delete('/:id/alerts', clearAlerts);

export default router;
