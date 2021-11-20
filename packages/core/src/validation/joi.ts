import { camelCase } from 'lodash';
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

/*
  From dog-joi-normalize
  Copyright (c) 2019 Jose Nuñez Ahumada

 const { error } = joi.validate(req.body, schema(joi), {
        abortEarly: false,
        allowUnknown: true,
    });

    if (error) {
        return res.status(422).json({ error: normalizeJoiErrors(error.details) });
    }

 */
export const normalizeJoiErrors = (errors: any[]) => {
  const errorsObject = {};
  errors.map((error) => {
    let { path, type } = error;
    type = camelCase(type.split(' ').join('_').replace('.', ' '));

    if (Array.isArray(path)) {
      path = path.join('_');
    }

    if (!errorsObject.hasOwnProperty(path)) {
      errorsObject[path] = {
        type,
        path,
      };
    }
  });
  return errorsObject;
};
