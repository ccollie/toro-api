import { badRequest } from '@hapi/boom';
import Ajv, { ValidateFunction } from 'ajv';
import AjvErrors from 'ajv-errors';
import AjvKeywords from 'ajv-keywords';
import addFormats from 'ajv-formats';

const ajv = new Ajv({
  $data: true,
  coerceTypes: true,
  useDefaults: true,
  verbose: true,
  allErrors: true,
});
AjvErrors(ajv);
addFormats(ajv);
AjvKeywords(ajv);

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

export function validate(
  validator: ValidateFunction,
  schema: any,
  data: any,
): any {
  if (!validator(data)) {
    const errors = validator.errors;
    if (errors.length === 1) {
      const { message, ...rest } = errors[0];
      throw badRequest(message, rest);
    }
    throw badRequest('Error validating data', errors);
  }
}

export { ajv };
