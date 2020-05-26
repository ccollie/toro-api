const identityAccessor = (x) => x;

function getBasicStats(values, accessor = identityAccessor) {
  let count = 0;
  let sum = 0;
  let vk = 0;
  let mean = 0;
  let stdDev = 0;
  let min = Number.MAX_SAFE_INTEGER;
  let max = Number.MIN_SAFE_INTEGER;

  values.forEach((rec) => {
    const val = parseFloat(accessor(rec));
    if (isNaN(val)) return;

    min = Math.min(min, val);
    max = Math.max(max, val);

    const oldMean = mean;
    count = count + 1;
    sum = sum + val;
    mean = sum / count;
    vk = vk + (val - mean) * (val - oldMean);
    stdDev = Math.sqrt(vk / (count - 1));
  });

  return {
    count,
    min,
    max,
    mean,
    stdDev,
  };
}

module.exports = {
  getBasicStats,
};
