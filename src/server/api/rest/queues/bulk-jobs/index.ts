const router = require('express').Router({ mergeParams: true });
import { createBulkActionHandler } from './createBulkActionHandler';

const retry = createBulkActionHandler('retry');
const promote = createBulkActionHandler('promote');
const remove = createBulkActionHandler('remove');

router.delete('/', remove);
router.patch('/', retry);

router.post('/remove', remove);
router.post('/promote', promote);
router.post('/retry', retry);

export default router;
