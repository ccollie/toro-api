// Query Evaluation Operators: https://docs.mongodb.com/manual/reference/operator/query-evaluation/
import { isFunction } from 'lodash';
import {
  createQueryOperator,
  $mod as __mod,
  $regex as __regex,
} from '../predicates';

import safeEval from 'notevil';
import { parseExpression } from '../utils';
import { QueryContext } from '../../queryContext';
import { QueryEvalFunc } from '../../utils';

export const $mod = createQueryOperator(__mod);
export const $regex = createQueryOperator(__regex);

/**
 * Allows the use of aggregation expressions within the query language.
 *
 * @param context
 * @param selector
 * @param value
 * @returns {Function}
 */
export function $expr(
  context: QueryContext,
  selector: string,
  value,
): QueryEvalFunc {
  return parseExpression(context, value);
}

/**
 * Matches documents that satisfy a JavaScript expression.
 *
 * @param context
 * @param selector
 * @param value
 * @returns {Function}
 */
export function $where(
  context: QueryContext,
  selector: string,
  value,
): QueryEvalFunc {
  if (!isFunction(value)) {
    const expr = 'return ' + value + ';';
    value = safeEval.Function('this', expr);
  }
  return (obj): boolean => !!value(obj) === true;
}
