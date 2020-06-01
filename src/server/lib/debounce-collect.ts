// modified from https://github.com/rstacruz/debounce-collect to allow
// for max number of items before flushing
import { systemClock } from './clock';

interface DebounceCollectOptions {
  immediate: boolean;
  maxItems: number;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function debounce(
  func,
  wait = 100,
  opts: Partial<DebounceCollectOptions> = {},
) {
  opts = {
    immediate: false,
    maxItems: 0,
    ...opts,
  };

  let timer, context, timestamp, result;
  let args = [];

  function call(): unknown {
    return func.call(context, args);
  }

  function reset(): void {
    context = null;
    args = [];
  }

  function onTimeout(): void {
    const elapsed = systemClock.getTime() - timestamp;

    if (elapsed < wait && elapsed > 0) {
      timer = setTimeout(onTimeout, wait - elapsed);
    } else {
      timer = null;
      if (!opts.immediate) {
        result = call();
        if (!timer) reset();
      }
    }
  }

  return function debounced(...args): any {
    context = this;
    args.push([...args]);
    timestamp = systemClock.getTime();
    const callNow =
      (opts.immediate && !timer) ||
      (opts.maxItems && args.length >= opts.maxItems);
    if (!timer) timer = setTimeout(onTimeout, wait);
    if (callNow) {
      result = call();
      reset();
    }

    return result;
  };
}
