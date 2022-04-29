import { quantile } from './quantile';
import { DDSketch } from '@datadog/sketches-js';

export enum AggregationType {
  LATEST = 'LATEST',
  MAX = 'MAX',
  MIN = 'MIN',
  AVG = 'AVG',
  SUM = 'SUM',
  COUNT = 'COUNT',
  P90 = 'P90',
  P95 = 'P95',
  P99 = 'P99',
}

export type AggregateFunction = (data: number[]) => number;

function percentileFactory(percentile: number): AggregateFunction {
  return (data: number[]): number => {
    return quantile(data, percentile);
  };
}

export function getAggregateFunction(
  aggregationType: AggregationType,
): AggregateFunction {
  switch (aggregationType) {
    case AggregationType.AVG:
      return (data: number[]): number => {
        const total = data.reduce((res, value) => res + value, 0);
        return data.length ? total / data.length : 0;
      };
    case AggregationType.COUNT:
      return (data: number[]) => data.length;
    case AggregationType.LATEST:
      return (data: number[]) => (data.length ? data[data.length] : NaN);
    case AggregationType.MAX:
      return (data: number[]) => Math.max(...data);
    case AggregationType.MIN:
      return (data: number[]) => Math.min(...data);
    case AggregationType.SUM:
      return (data: number[]) => data.reduce((res, value) => res + value, 0);
    case AggregationType.P90:
      return percentileFactory(0.9);
    case AggregationType.P95:
      return percentileFactory(0.95);
    case AggregationType.P99:
      return percentileFactory(0.99);
  }
}

export function getSketchAggregateValue(
  sketch: DDSketch,
  aggregator: AggregationType,
): number | null {
  switch (aggregator) {
    case AggregationType.LATEST:
      break;
    case AggregationType.COUNT:
      return sketch.count;
    case AggregationType.AVG: {
      const { sum, count } = sketch;
      return count === 0 ? 0 : sum / count; // todo: round
    }
    case AggregationType.MAX:
      return sketch.max;
    case AggregationType.MIN:
      return sketch.min;
    case AggregationType.P90:
      return sketch.getValueAtQuantile(0.9);
    case AggregationType.P95:
      return sketch.getValueAtQuantile(0.95);
    case AggregationType.P99:
      return sketch.getValueAtQuantile(0.99);
    case AggregationType.SUM:
      return sketch.sum;
  }
  return null;
}
