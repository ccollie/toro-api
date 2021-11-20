import * as Joi from 'joi';

const IdPattern = /[a-zA-Z0-9_]+[\w.:-]*/;

const schema = Joi.object()
  .keys({
    id: Joi.string().trim().pattern(IdPattern).min(3).max(60).optional(),
    type: Joi.string().pattern(new RegExp('^[a-zA-Z0-9_-]{3,30}$')).required(),
    name: Joi.string().min(3).max(128).required(),
    enabled: Joi.boolean().optional().default(true),
  })
  .unknown(true);

export default schema;
