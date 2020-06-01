import boom from '@hapi/boom';
import Ajv, { ValidateFunction } from 'ajv';
import betterAjvErrors from 'better-ajv-errors';
import cronstrue from 'cronstrue';

const ajv = new Ajv({
  $data: true,
  coerceTypes: true,
  useDefaults: true,
  verbose: true,
  // jsonPointers: true,
});

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
    const output = betterAjvErrors(schema, data, validator.errors, {
      format: 'js',
    });
    throw boom.badRequest('Error validating job data', output);
  }
}

export { ajv };
