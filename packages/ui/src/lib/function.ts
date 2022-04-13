import { __DEV__, isFunction } from './assertion';
import { AnyFunction, FunctionArguments } from '@/types';

// todo: fix the typing here
export function runIfFn<T, U = unknown>(
  valueOrFn: T | ((...args: U[]) => T),
  ...args: U[]
): T {
  if (isFunction(valueOrFn) && !Array.isArray(valueOrFn)) {
    return (valueOrFn as any)(...args);
  }
  return valueOrFn as T;
}


export function callAllHandlers<T extends (event: any) => void>(
  ...fns: (T | undefined)[]
) {
  return function func(event: FunctionArguments<T>[0]) {
    fns.some((fn) => {
      fn?.(event);
      return event?.defaultPrevented;
    });
  };
}

export function callAll<T extends AnyFunction>(...fns: (T | undefined)[]) {
  return function mergedFn(arg: FunctionArguments<T>[0]) {
    fns.forEach((fn) => {
      fn?.(arg);
    });
  };
}

export function once(fn?: Function | null) {
  let result: any;

  return function func(this: any, ...args: any[]) {
    if (fn) {
      result = fn.apply(this, args);
      fn = null;
    }

    return result;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};

type MessageOptions = {
  condition: boolean;
  message: string;
};

export const warn = once((options: MessageOptions) => {
  const { condition, message } = options;
  if (condition && __DEV__) {
    console.warn(message);
  }
});

export const error = once((options: MessageOptions) => {
  const { condition, message } = options;
  if (condition && __DEV__) {
    console.error(message);
  }
});
