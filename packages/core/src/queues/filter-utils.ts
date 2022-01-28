import { ExprEval, isNumber, isObject } from '@alpen/shared';
import type { JobJson } from 'bullmq';
import type { Maybe } from '../types';

export type ContextType = Parameters<typeof ExprEval.evaluate>[1];


function createMathFn(name) {
  const fn = (Math as any)[name];
  return function (val: unknown) {
    if (val === null || val === undefined) {
      return val;
    }
    if (typeof val !== 'number') {
      val = parseFloat(`${val}`);
    }
    return fn(val);
  };
}

// todo: absolutely need Math.max and Math.min
type MathFuncType = keyof Math;
const BaseMathFuncs: MathFuncType[] = [
  'abs',
  'ceil',
  'floor',
  'log',
  'round',
  'sign',
  'sqrt',
  'trunc',
];
// @ts-ignore
const MathFuncs: Record<MathFuncType, any> = { PI: Math.PI };

BaseMathFuncs.forEach((name) => {
  MathFuncs[name] = createMathFn(name);
});

const ObjectMethods = {
  keys: (obj: unknown): string[] => {
    return isObject(obj) ? Object.keys(obj) : [];
  },
  values: (obj: unknown): string[] => {
    return isObject(obj) ? Object.values(obj) : [];
  },
  entries: (obj: unknown)  => {
    return isObject(obj) ? Object.entries(obj) : [];
  },
};

export function createContext(job: JobJson): ContextType {
  const context = {
    Math: MathFuncs,
    Object: ObjectMethods,
    ...job,
    get responseTime(): Maybe<number> {
      return isNumber(job.finishedOn)
        ? job.finishedOn - job.timestamp
        : undefined;
    },
    get processTime(): Maybe<number> {
      return isNumber(job.finishedOn) && isNumber(job.processedOn)
        ? job.finishedOn - job.processedOn
        : undefined;
    },
    get waitTime(): Maybe<number> {
      return isNumber(job.processedOn)
        ? job.processedOn - job.timestamp
        : undefined;
    },
    get runTime(): Maybe<number> {
      return isNumber(job.finishedOn) && isNumber(job.processedOn)
        ? job.finishedOn - job.processedOn
        : undefined;
    },
  };
  return context as unknown as ContextType;
}
