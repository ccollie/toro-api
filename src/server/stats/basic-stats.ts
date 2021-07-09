type ValueAccessor = (x: any) => number;
const identityAccessor: ValueAccessor = (x: any) => x;

export interface BasicStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  stdDev: number;
}

export function getBasicStats(
  values: any[],
  accessor: ValueAccessor = identityAccessor,
): BasicStats {
  let count = 0;
  let sum = 0;
  let vk = 0;
  let mean = 0;
  let min = Number.MAX_SAFE_INTEGER;
  let max = Number.MIN_SAFE_INTEGER;

  values.forEach((rec) => {
    const val = accessor(rec);
    if (isNaN(val)) return;

    min = Math.min(min, val);
    max = Math.max(max, val);

    const oldMean = mean;
    count = count + 1;
    sum = sum + val;
    mean = sum / count;
    vk = vk + (val - mean) * (val - oldMean);
  });

  const stdDev = count ? Math.sqrt(vk / (count - 1)) : 0;

  return {
    count,
    min,
    max,
    mean,
    stdDev,
  };
}
