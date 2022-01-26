import { random } from '@alpen/shared';
import { SlidingTimeWindowAggregator } from '../../';

export function validateCounts(instance: SlidingTimeWindowAggregator): void {
  let timestamps: number[] = [];
  let values: number[] = [];

  function pushValue(ts: number, value: number) {
    timestamps.push(ts);
    values.push(value);
  }

  function trim(startTs: number) {
    const stamps = [];
    const nums = [];
    timestamps.forEach((ts, index) => {
      if (ts >= startTs) {
        stamps.push(ts);
        nums.push(values[index]);
      }
    });
    timestamps = stamps;
    values = nums;
  }

  // enough so we rotate
  const sliceCount =
    Math.floor(instance.windowSize / instance.granularity) * 2 + 1;

  let timeStamp = 1000;
  let lastTick = instance.lastTick;
  let count = 0;

  for (let i = 0; i < sliceCount; i++) {
    const num = random(0, 100);
    instance.update(num, timeStamp);

    if (!lastTick) lastTick = instance.lastTick;
    if (lastTick !== instance.lastTick) {
      lastTick = instance.lastTick;
      trim(instance.currentWindowStart);
      count = values.length;
    }

    pushValue(timeStamp, num);
    count++;

    expect(instance.count).toBe(count);
    timeStamp += instance.granularity;
  }
}
