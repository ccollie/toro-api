/**
 * Return a value without parsing.
 * @param expr
 */
import { QueryContext } from '../../queryContext';
import { EvalFunc } from '../../utils';

export function $literal(expr: any, context: QueryContext): EvalFunc {
  return (): any => expr;
}
