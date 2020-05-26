/**
 * Conditional operators
 */
import { assert, EvalFunc } from '../../utils';
import { parseExpression } from '../utils';
import { isNil, isObject } from 'lodash';
import { QueryContext } from '../../queryContext';

/**
 * A ternary operator that evaluates one expression,
 * and depending on the result returns the value of one following expressions.
 *
 * @param expr
 * @param {QueryContext} context
 */
export function $cond(expr: any, context: QueryContext): EvalFunc {
  let ifExpr, thenExpr, elseExpr;
  const errorMsg = '$cond: invalid arguments';
  if (Array.isArray(expr)) {
    assert(expr.length === 3, errorMsg);
    ifExpr = parseExpression(context, expr[0]);
    thenExpr = parseExpression(context, expr[1]);
    elseExpr = parseExpression(context, expr[2]);
  } else {
    assert(isObject(expr), errorMsg);
    ifExpr = parseExpression(context, expr.if);
    thenExpr = parseExpression(context, expr.then);
    elseExpr = parseExpression(context, expr.else);
  }

  return (obj): any => {
    const condition = !!ifExpr(obj);
    return condition ? thenExpr(obj) : elseExpr(obj);
  };
}

/**
 * An operator that evaluates a series of case expressions. When it finds an expression which
 * evaluates to true, it returns the resulting expression for that case. If none of the cases
 * evaluate to true, it returns the default expression.
 *
 * @param expr
 * @param {QueryContext} context
 */
export function $switch(expr: any, context: QueryContext): EvalFunc {
  const errorMsg = 'Invalid arguments for $switch operator';
  assert(Array.isArray(expr.branches), errorMsg);

  const conditions = [];
  for (let i = 0; i < expr.branches.length; i++) {
    const { case: caseExpr, then: thenExpr } = expr.branches[i];
    assert(caseExpr && thenExpr, errorMsg);
    conditions.push({
      case: parseExpression(context, caseExpr),
      then: parseExpression(context, thenExpr),
    });
  }

  assert(
    expr.default,
    'Invalid arguments for the default branch of the $switch operator',
  );
  const defaultEval = parseExpression(context, expr.default);

  return (obj): any => {
    const found = conditions.find(({ case: _case }) => _case(obj));
    const fn = found && found.then ? found.then : defaultEval;
    return fn(obj);
  };
}

/**
 * Evaluates an expression and returns the first expression if it evaluates to a non-null value.
 * Otherwise, $ifNull returns the second expression's value.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {*}
 */
export function $ifNull(expr: any, context: QueryContext): EvalFunc {
  assert(
    Array.isArray(expr) && expr.length === 2,
    '$ifNull expression must resolve to array(2)',
  );
  const exec = parseExpression(context, expr);

  return (obj): any => {
    const args = exec(obj);
    return isNil(args[0]) ? args[1] : args[0];
  };
}
