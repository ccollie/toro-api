import * as Joi from 'joi';
import { parseDate } from '@alpen/shared';

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
