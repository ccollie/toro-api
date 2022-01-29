import { badRequest } from '@hapi/boom';
import { ValidateFunction } from 'ajv';
import cronstrue from 'cronstrue';
import { ajv } from '@alpen/shared';

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
      throw badRequest(message, rest);
    }
    throw badRequest('Error validating data', errors);
  }
}

export { ajv };
