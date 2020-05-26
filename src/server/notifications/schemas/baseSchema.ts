import Joi from '@hapi/joi';

const schema = Joi.object().keys({
  id: Joi.string().alphanum().min(3).max(60).required(),

  type: Joi.string().pattern(new RegExp('^[a-zA-Z0-9_-]{3,30}$')).required(),

  disable: Joi.boolean().default(false),
});

export default schema;
