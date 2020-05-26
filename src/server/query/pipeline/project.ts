import {
  assert,
  ensureArray,
  filterMissing,
  inArray,
  isEmpty,
  notInArray,
  merge,
  resolveGraph,
  EvalFunc,
} from '../utils';

import {
  each,
  isObject,
  isNumber,
  isString,
  isNil,
  unset,
  cloneDeep,
} from 'lodash';
import { parseExpression, idKey } from '../internal';
import * as projectionOperators from '../operators/projection';

import { QueryContext } from '../queryContext';

/**
 * Validate inclusion and exclusion values in expression
 *
 * @param {Object} expr The expression given for the projection
 */
function validateExpression(expr: any): void {
  const ID_KEY = idKey();
  const check = [false, false];
  each(expr, (v, k) => {
    if (k === ID_KEY) return;
    if (v === 0 || v === false) {
      check[0] = true;
    } else if (v === 1 || v === true) {
      check[1] = true;
    }
    assert(
      !(check[0] && check[1]),
      'Projection cannot have a mix of inclusion and exclusion.',
    );
  });
}

function isDirectInclusion(expr: any): boolean {
  return inArray([1, true], expr);
}

function isDirectExclusion(expr: any): boolean {
  return inArray([0, false], expr);
}

function parseInclusion(context: QueryContext, key: string) {
  // For direct projections, we use the resolved object value
  return (obj) =>
    resolveGraph(obj, key, {
      preserveMissing: true,
    });
}

function parseInclusionExpression(
  context: QueryContext,
  key: string,
  expr: any,
): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj): any => {
    const cond = exec(obj, context);
    if (isDirectInclusion(cond)) {
      return resolveGraph(obj, key, {
        preserveMissing: true,
      });
    }
    return undefined;
  };
}

function parseArray(context: QueryContext, expr: any): EvalFunc {
  const exec = parseExpression(context, expr);
  return (obj): any => {
    const args = exec(obj, context);
    assert(Array.isArray(args), 'Expected array in $project');
    return args.map((v) => (isNil(v) ? null : v));
  };
}

function parseOperator(
  context: QueryContext,
  key: string,
  expr: any,
  operator: string,
): EvalFunc {
  const operatorFunction = projectionOperators[operator];

  // apply the projection operator on the operator expression for the key
  if (operator === '$slice') {
    // $slice is handled differently for aggregation and projection operations
    if (ensureArray(expr).every(isNumber)) {
      // $slice for projection operation
      return operatorFunction(expr, key, context);
    } else {
      // $slice for aggregation operation
      const exec = parseExpression(context, expr);
      return (obj, ctx): any => {
        return exec(obj, ctx);
      };
    }
  } else {
    return operatorFunction(expr, key, context);
  }
}

/**
 * Parse the projection spec and return a transformation function
 * which performs the projection
 *
 * @param {QueryContext} context
 * @param {Object} expr The expression object of $project operator
 * @param {Array} expressionKeys The key in the 'expr' object
 * @param {Boolean} idOnlyExcludedExpression Boolean value indicating whether
 * only the ID key is excluded
 */
function parseSpec(
  context: QueryContext,
  expr: any,
  expressionKeys,
  idOnlyExcludedExpression: boolean,
): EvalFunc {
  const ID_KEY = idKey();

  let foundSlice = false;
  let foundExclusion = false;
  const dropKeys = [];

  validateExpression(expr);

  if (idOnlyExcludedExpression) {
    dropKeys.push(ID_KEY);
  }

  const valueFns = {};

  expressionKeys.forEach((key) => {
    // final computed value of the key
    let value;

    // expression to associate with key
    const subExpr = expr[key];

    if (key !== ID_KEY && isDirectExclusion(subExpr)) {
      foundExclusion = true;
    }

    if (key === ID_KEY && isEmpty(subExpr)) {
      // tiny optimization here to skip over id
      value = parseInclusion(context, key);
    } else if (isString(subExpr)) {
      const compiled = parseExpression(context, subExpr);
      value = (obj) => compiled(obj, context);
    } else if (isDirectInclusion(subExpr)) {
      // For direct projections, we use the resolved object value
      value = parseInclusion(context, key);
    } else if (Array.isArray(subExpr)) {
      value = parseArray(context, subExpr);
    } else if (isObject(subExpr)) {
      const subExprKeys = Object.keys(subExpr);
      const operator = subExprKeys.length > 1 ? '' : subExprKeys[0];

      if (!!projectionOperators[operator]) {
        foundSlice = operator === '$slice';
        value = parseOperator(context, key, subExpr[operator], operator);
      } else {
        // compute the value for the sub expression for the key
        if (key.indexOf('.') === -1) {
          // direct child ???
          // eslint-disable-next-line max-len
          // https://docs.mongodb.com/manual/reference/operator/aggregation/project/index.html#new-array-fields
          // New Array Fields
          if (Array.isArray(subExpr)) {
            value = parseArray(context, subExpr);
          } else {
            value = parseSpec(context, subExpr, subExprKeys, false);
          }
        } else {
          // eslint-disable-next-line max-len
          // https://docs.mongodb.com/manual/reference/operator/aggregation/project/index.html#exclude-fields-conditionally
          // Exclude Fields Conditionally
          value = parseInclusionExpression(context, key, subExpr);
        }
      }
    } else {
      dropKeys.push(key);
      value = () => undefined;
    }

    valueFns[key] = value;
  });

  const valueKeys = Object.keys(valueFns);

  function transform(obj): object {
    let newObj = {};

    valueKeys.forEach((key) => {
      // get value with object graph
      const value = valueFns[key](obj);

      // add the value at the path
      if (value !== undefined) {
        merge(newObj, value, {
          flatten: true,
        });
      }
    });

    // filter out all missing values preserved to support correct merging
    filterMissing(newObj);

    // if projection included $slice operator
    // Also if exclusion fields are found or we want to exclude only the id field
    // include keys that were not explicitly excluded
    if (foundSlice || foundExclusion || idOnlyExcludedExpression) {
      newObj = Object.assign({}, obj, newObj);
      if (dropKeys.length > 0) {
        newObj = cloneDeep(newObj);
        dropKeys.forEach((k) => unset(newObj, k));
      }
    }

    return newObj;
  }

  return transform;
}

/**
 * Reshapes a document stream.
 * $project can rename, add, or remove fields as well as create computed values and sub-documents.
 *
 * @param {QueryContext} context
 * @param expr
 * @returns {Function}
 */
export function $project(context: QueryContext, expr: any): EvalFunc {
  // result collection
  let expressionKeys = Object.keys(expr);
  let idOnlyExcludedExpression = false;
  const ID_KEY = idKey();

  // validate inclusion and exclusion
  validateExpression(expr);

  if (inArray(expressionKeys, ID_KEY)) {
    const id = expr[ID_KEY];
    if (id === 0 || id === false) {
      expressionKeys = expressionKeys.filter(notInArray.bind(null, [ID_KEY]));
      assert(
        notInArray(expressionKeys, ID_KEY),
        'Must not contain collections id key',
      );
      idOnlyExcludedExpression = isEmpty(expressionKeys);
    }
  } else {
    // if not specified the add the ID field
    expressionKeys.push(ID_KEY);
  }

  const transformer = parseSpec(
    context,
    expr,
    expressionKeys,
    idOnlyExcludedExpression,
  );

  return (collection): any => {
    if (Array.isArray(collection)) {
      return collection.map(transformer);
    } else {
      return transformer(collection);
    }
  };
}
