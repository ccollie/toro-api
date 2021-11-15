import * as boom from '@hapi/boom';
import Ajv, { ValidateFunction } from 'ajv';
import AjvErrors from 'ajv-errors';
import cronstrue from 'cronstrue';

const ajv = new Ajv({
  $data: true,
  coerceTypes: true,
  useDefaults: true,
  verbose: true,
  allErrors: true,
});
AjvErrors(ajv);

ajv.addFormat('identifier', {
  type: 'string',
  validate: function (data) {
    return /^[a-z_$][a-z0-9_$]*$/i.test(data + '');
  },
});

ajv.addFormat('positive', {
  type: 'number',
  validate: (x) => x > 0,
});

ajv.addFormat('cron', {
  type: 'string',
  validate: (x) => {
    try {
      cronstrue.toString(x);
      return true;
    } catch {
      return false;
    }
  },
});

export function validate(
  validator: ValidateFunction,
  schema: any,
  data: any,
): any {
  if (!validator(data)) {
    const errors = validator.errors;
    if (errors.length === 1) {
      const { message, ...rest } = errors[0];
      throw boom.badRequest(message, rest);
    }
    throw boom.badRequest('Error validating job data', errors);
  }
}

export { ajv };
