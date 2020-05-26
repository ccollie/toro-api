import { QueryContext } from '../../queryContext';
import { parseExpression } from '../../internal';
import { EvalFunc } from '../../utils';

function truthy(arg): boolean {
  return !!arg;
}

/**
 * Returns true only when all its expressions evaluate to true. Accepts any number of
 * argument expressions.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {*}
 */
export function $and(expr: any, context: QueryContext): EvalFunc {
  const compute = parseExpression(context, expr);
  // todo: make sure its an array
  return (obj, context): boolean => {
    const args = compute(obj, context);
    return truthy(args) && args.every(truthy);
  };
}

/**
 * Returns true when any of its expressions evaluates to true. Accepts any number of
 * argument expressions.
 *
 * @param expr
 * @param {QueryContext} context
 */
export function $or(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);
  return (obj, context): boolean => {
    const args = exec(obj, context);
    return truthy(args) && args.some(truthy);
  };
}

/**
 * Returns the boolean value that is the opposite of its argument expression. Accepts a
 * single argument expression.
 *
 * @param expr
 * @param {QueryContext} context
 */
export function $not(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);
  // todo: make sure its a single value
  return (obj, context): boolean => {
    const value = exec(obj, context);
    return !value;
  };
}
