import { getSlidingWindowDefaults } from '../lib/utils';
import Joi from '@hapi/joi';
import ms from 'ms';
import { isNumber } from '../../lib/utils';
import { parseDate } from '../../lib/datetime';

const dateTimeValidator = (value, helpers) => {
  value = parseDate(value, undefined);

  if (value === undefined) {
    return helpers.error('any.invalid');
  }

  return value;
};

export const dateLikeSchema = Joi.alternatives()
  .try(
    Joi.number().integer().positive(),

    Joi.date(),
  )
  .custom(
    dateTimeValidator,
    'A date specified as an ISO string, an epoch timestamp integer or a js Date',
  )
  .unit('date');

const durationValidator = (value, helpers) => {
  if (isNumber(value)) {
    return parseInt(value);
  }

  value = ms(value);

  if (value === undefined) {
    return helpers.error('any.invalid');
  }

  return value;
};

export const durationSchema = Joi.alternatives()
  .try(
    Joi.number().integer().positive().unit('milliseconds').example(5000),

    Joi.string().trim().min(2).example('5 mins'),
  )
  .custom(
    durationValidator,
    'A duration specified as an integer or a string specifier (e.g "5 mins")',
  )
  .unit('milliseconds');

const windowDefaults = getSlidingWindowDefaults();

export const slidingWindowSchema = Joi.object().keys({
  duration: durationSchema.default(windowDefaults.duration),
  period: Joi.number().integer().positive().default(windowDefaults.period),
});
