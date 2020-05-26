import { QueryContext } from './queryContext';
import {
  getJsType,
  isOperator,
  assert,
  normalize,
  JsType,
  EvalFunc,
  QueryEvalFunc,
} from './utils';
import { each, has, isString, isFunction, isObject } from 'lodash';
import { OP_EXPRESSION, OP_GROUP, OP_QUERY } from './constants';
import { OPERATORS } from './operators';

export function idKey(): string {
  return 'id';
}

/**
 * Parses an expression and returns a function which returns
 * the actual value of the expression using a given object as context
 *
 * @param {QueryContext} context
 * @param {*} expr the expression for the given field
 * @param {string} operator the operator to resolve the field with
 * @returns {*}
 */
// eslint-disable-next-line max-len
export function parseExpression(
  context: QueryContext,
  expr: any,
  operator: string = null,
): EvalFunc {
  function parseArray(): EvalFunc {
    const compiled = expr.map((item) => parseExpression(context, item));

    return (obj, ctx) => {
      return compiled.map((handler) => handler(obj, ctx));
    };
  }

  function parseObject(): EvalFunc {
    let compiled = Object.create(null);
    const keys = Object.keys(expr);
    keys.forEach((key) => {
      const val = expr[key];
      compiled[key] = parseExpression(context, val, key);
      // must run ONLY one aggregate operator per expression
      // if so, return result of the computed value
      if ([OP_EXPRESSION, OP_GROUP].some((c) => has(OPERATORS[c], key))) {
        // there should be only one operator
        assert(
          Object.keys(expr).length === 1,
          'Invalid aggregation expression "' + JSON.stringify(expr) + '"',
        );
        compiled = compiled[key];
        return false; // break
      }
    });

    if (isFunction(compiled)) {
      return compiled;
    }

    return (obj: any, ctx): any => {
      const result = Object.create(null);
      keys.forEach((key) => {
        result[key] = compiled[key](obj, ctx);
      });
      return result;
    };
  }

  // if the field of the object is a valid operator
  if (operator && has(OPERATORS[OP_EXPRESSION], operator)) {
    return OPERATORS[OP_EXPRESSION][operator](expr, context);
  }

  // if expr is a variable for an object field
  if (isString(expr) && expr.length > 0 && expr[0] === '$') {
    const field = expr.slice(1);
    return context.getFieldResolver(field);
  }
  // todo - parse fields here ????

  // check and return value if already in a resolved state
  switch (getJsType(expr)) {
    case JsType.ARRAY:
      return parseArray();
    case JsType.OBJECT:
      return parseObject();
    default:
      return (): any => expr;
  }
}

export function compileQuery(
  criteria: any,
  context: QueryContext,
): QueryEvalFunc {
  assert(isObject(criteria), 'query criteria must be an object');

  const compiled = [];

  function processOperator(field: string, operator, value): void {
    const operatorFn = OPERATORS[OP_QUERY][operator];
    assert(!!operatorFn, `invalid query operator ${operator} detected`);
    compiled.push(operatorFn(context, field, value));
  }

  let whereOperator;

  function parse(criteria): EvalFunc {
    each(criteria, (expr, field) => {
      // save $where operators to be executed after other operators
      if ('$where' === field) {
        whereOperator = { field, expr };
      } else if ('$expr' === field) {
        processOperator(field, field, expr);
      } else if (['$and', '$or', '$nor'].includes(field)) {
        processOperator(field, field, expr);
      } else {
        // normalize expression
        assert(!isOperator(field), `unknown top level operator: ${field}`);
        expr = normalize(expr);
        each(expr, (val, op) => {
          processOperator(field, op, val);
        });
      }

      if (isObject(whereOperator)) {
        processOperator(
          whereOperator['field'],
          whereOperator['field'],
          whereOperator['expr'],
        );
        whereOperator = null;
      }
    });

    /**
     * Checks if the object passes the query criteria. Returns true if so, false otherwise.
     * @param obj
     * @param ctx
     * @returns {boolean}
     */
    return (obj, ctx): boolean => {
      for (let i = 0, len = compiled.length; i < len; i++) {
        if (!compiled[i](obj, ctx)) {
          return false;
        }
      }
      return true;
    };
  }

  return parse(criteria);
}
