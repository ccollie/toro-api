import ms from 'ms';
import Joi from 'joi';

const durationValidator = (value, helpers) => {
  const num = parseFloat(value);
  if (!isNaN(num)) {
    return num;
  }

  value = ms(value);

  if (value === undefined) {
    return helpers.error('any.invalid');
  }

  return value;
};

export const DurationSchema = Joi.alternatives()
  .try(
    Joi.number().integer().unit('milliseconds').example(5000),

    Joi.string().trim().min(2).example('5 mins'),
  )
  .custom(
    durationValidator,
    'A duration specified as an integer or a string specifier (e.g "5 mins")',
  )
  .unit('milliseconds');
