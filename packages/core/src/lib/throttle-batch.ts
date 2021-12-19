// copied from https://github.com/futpib/throttle-batch

export interface ThrottleBatchOptions<A, B> {
  threshold?: number;
  createInitialBatch?: () => B;
  addArgumentsToBatch?: (batch: B, args: A) => B;
}

export function throttleBatch<A extends any[], B = Array<A[0]>>(
  f: (batch: B) => void,
  options: number | ThrottleBatchOptions<A, B> = {},
): (...args: A) => void {
  const {
    threshold = 0,
    createInitialBatch = () => [] as any,
    addArgumentsToBatch = (batch, [arg]) => [...(batch as any), arg] as any,
  }: ThrottleBatchOptions<A, B> = typeof options === 'number'
    ? { threshold: options }
    : options;

  let lastCallTime: undefined | number;
  let timeout: undefined | ReturnType<typeof setTimeout>;
  let batch: undefined | B;

  return function (...args: any[]) {
    if (batch === undefined) {
      batch = createInitialBatch();
    }

    batch = addArgumentsToBatch(batch, args as any);

    const now = Date.now();
    const shouldCall =
      now - (lastCallTime ?? Number.NEGATIVE_INFINITY) > threshold;

    if (shouldCall) {
      timeout && clearTimeout(timeout);
      timeout = undefined;
      lastCallTime = Date.now();
      const batch_ = batch;
      batch = undefined;
      f(batch_);
    } else {
      timeout && clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (batch === undefined) {
          return;
        }

        lastCallTime = Date.now();
        const batch_ = batch;
        batch = undefined;
        f(batch_);
      }, threshold);
    }
  };
}
