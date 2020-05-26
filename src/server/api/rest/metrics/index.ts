'use strict';
const router = require('express').Router({ mergeParams: true });
import { getTypes } from '../../../monitor/metrics';
import { asyncHandler as wrap } from '../middleware';

const getAll = async (req, res) => {
  const typeMap = getTypes();
  const metrics = [];
  for (const [_, clazz] of typeMap.entries()) {
    metrics.push({
      key: clazz.key,
      description: clazz.description,
      unit: clazz.unit,
    });
  }
  res.json(metrics);
};

router.get('/', wrap(getAll));

export default router;
