import { parseDuration } from '../../lib/datetime';
import config from '../../config';
import { StatsWindow } from '@src/types';

const DEFAULT_DURATION = 2 * 60 * 1000;
const DEFAULT_PERIOD = 750;

let defaultSlidingWindow;

/*
Gets the default statistical window from config
@returns {IStatsWindow}
 */
export function getSlidingWindowDefaults(): StatsWindow {
  if (!defaultSlidingWindow) {
    defaultSlidingWindow = config.getValue('defaultSlidingWindow', {
      duration: DEFAULT_DURATION,
      period: DEFAULT_PERIOD,
    });
    defaultSlidingWindow.duration = parseDuration(
      defaultSlidingWindow.duration || DEFAULT_DURATION,
    );
    defaultSlidingWindow.period = parseDuration(defaultSlidingWindow.period || DEFAULT_PERIOD);
  }
  return defaultSlidingWindow;
}

// Compute nearest lower power of 2 for n in [1, 2**31-1]:
export function nearestPowerOf2(n) {
  return 1 << (31 - Math.clz32(n));
}

export function calculateWindowSize(duration): number {
  const len = Math.ceil(Math.log(duration) / Math.log(2));
  return Math.max((duration / len) | 0, 500);
}
