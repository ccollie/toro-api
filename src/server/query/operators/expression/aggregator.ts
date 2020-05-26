import { QueryContext } from '../../queryContext';
import { isEmpty, assert, EvalFunc } from '../../utils';
import { parseExpression } from '../../internal';
import { isNumber } from 'lodash';
import {
  createAggregator as create,
  BaseAggregator,
} from '../../../monitor/metrics/aggregators';

function createAggregator(context, type, options = {}): BaseAggregator {
  const aggOptions = {
    ...(context.options || {}),
    ...options,
  };
  const aggregator = create(type, aggOptions);
  context.addAggregator(aggregator);
  // todo: aggregator.onChange(v => context.onUpdate(v))
  return aggregator;
}

function updateAggregator(aggregator, value: any): void {
  if (isNumber(value)) {
    aggregator.update(value);
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const val = value[i];
      if (isNumber(val)) {
        aggregator.update(val);
      }
    }
  }
}

function createAggregateOperator(
  context: QueryContext,
  type,
  expr: any,
  options?: object,
): EvalFunc {
  if (isNumber(expr)) {
    // take a short cut if expr is number literal
    return (): any => expr;
  }

  const exec = parseExpression(context, expr);
  const aggregator = createAggregator(context, type, options);

  return (obj, ctx): any => {
    const items = exec(obj, ctx);
    updateAggregator(aggregator, items);

    return aggregator.value;
  };
}

/**
 * Returns an average of all the values in a group.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {*}
 */
export function $slidingAvg(expr: any, context: QueryContext): EvalFunc {
  return createAggregateOperator(context, 'mean', expr);
}

/**
 * Returns the highest value in a group.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {*}
 */
export function $slidingMax(expr: any, context: QueryContext): EvalFunc {
  return createAggregateOperator(context, 'max', expr);
}

/**
 * Returns the lowest value in a group.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {*}
 */
export function $slidingMin(expr: any, context: QueryContext): EvalFunc {
  return createAggregateOperator(context, 'min', expr);
}

/**
 * Returns the sum of all the values in a group.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {*}
 */
export function $slidingSum(expr: any, context: QueryContext): EvalFunc {
  return createAggregateOperator(context, 'sum', expr);
}

function createZScoreOperator(name, context, expr, valueFn): EvalFunc {
  // $zscorePeak: { input: "$latency", threshold: 3.5, lag: 100, influence: 0.5 }
  const threshold = expr.threshold || 3.5;
  const influence = expr.influence || 0.5;
  const lag = expr.lag || 0;

  assert(!isEmpty(expr.input), name + ': input expression expected');
  assert(isNumber(threshold), name + ': threshold should be a number');
  assert(
    isNumber(influence) && influence >= 0 && influence <= 1,
    name + ': influence should be a float between 0 and 1',
  );
  assert(
    isNumber(lag) && lag >= 0,
    name + ': lag should be a positive integer',
  );

  const options = {
    threshold,
    influence,
    lag,
  };

  const exec = parseExpression(context, expr.input);
  const zscore = createAggregator(context, 'zscore', options);

  return (obj, ctx): any => {
    const values = exec(obj, ctx);
    updateAggregator(zscore, values);

    return valueFn(zscore);
  };
}

export function $smoothedZScore(expr: any, context: QueryContext): EvalFunc {
  return createZScoreOperator(
    '$smoothedZScore',
    context,
    expr,
    (agg) => agg.value,
  );
}

export function $zscorePeak(expr: any, context: QueryContext): EvalFunc {
  return createZScoreOperator(
    '$zscorePeak',
    context,
    expr,
    (agg) => agg.signal,
  );
}

export function $percentile(expr: any, context: QueryContext): EvalFunc {
  // $percentile: { field: "$latency", p: 0.90, accuracy: 0.05 }

  const alpha = expr.accuracy || 0.02;
  const field = expr.field;
  const p = expr.p || 0.9;

  assert(!isEmpty(field), '$percentile: field expression expected');
  assert(
    isNumber(alpha) && alpha > 0 && alpha <= 1.0,
    '$percentile: accuracy should be a fraction between 0.0 and 1.0',
  );
  assert(
    isNumber(p) && p > 0 && p <= 1.0,
    '$percentile: p should be a float greater than 0.0 and less than 1.0',
  );

  const options = {
    alpha,
    q: p,
  };

  const exec = parseExpression(context, expr.field);
  const quantile = createAggregator(context, 'quantile', options);

  return (obj, ctx): any => {
    const values = exec(obj, ctx);
    updateAggregator(quantile, values);

    return quantile.value;
  };
}
