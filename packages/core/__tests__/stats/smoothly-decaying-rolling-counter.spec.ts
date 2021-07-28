/*
 *
 *  Copyright 2016 Vladimir Bukhtoyarov
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *          http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import ms from 'ms';
import {
  MAX_CHUNKS,
  MIN_CHUNK_RESETTING_INTERVAL_MILLIS,
  SmoothlyDecayingRollingCounter,
} from '../../src/stats';

describe('SmoothlyDecayingRollingCounter', () => {
  it('adds and calculates sum', () => {
    let timeMillis = 0;

    const counter = new SmoothlyDecayingRollingCounter(2000, 2);

    counter.add(100, timeMillis);
    expect(counter.getSum()).toBe(100);

    timeMillis = 2600;
    expect(counter.getSum(timeMillis)).toBe(40);

    timeMillis = 2980;
    expect(counter.getSum(timeMillis)).toBe(2);

    timeMillis = 3000;
    expect(counter.getSum(timeMillis)).toBe(0);

    counter.add(200, timeMillis);
    expect(counter.getSum()).toBe(200);

    expect(counter.getSum(4000)).toBe(200);

    timeMillis = 5000;
    expect(counter.getSum(timeMillis)).toBe(200);
    counter.add(300, timeMillis);
    expect(counter.getSum()).toBe(500);

    expect(counter.getSum(5500)).toBe(400);

    expect(counter.getSum(6000)).toBe(300);

    // clear counter
    expect(counter.getSum(10_000)).toBe(0);
  });

  it('implements toString()', () => {
    const counter = new SmoothlyDecayingRollingCounter(ms('1 sec'), 3);
    // System.out.println(counter.toString());
  });

  it('properly set windowsize and chunk count', () => {
    const TenSeconds = ms('10 secs');

    const counter = new SmoothlyDecayingRollingCounter(TenSeconds, 5);
    expect(counter.rollingWindow).toBe(TenSeconds);
    expect(counter.chunkCount).toBe(5);
  });

  it('should disallow to short an invalidation period', () => {
    expect(
      () =>
        new SmoothlyDecayingRollingCounter(
          MIN_CHUNK_RESETTING_INTERVAL_MILLIS - 1,
          4,
        ),
    ).toThrow(RangeError);
  });

  it('should disallow too many chunks', () => {
    expect(
      () => new SmoothlyDecayingRollingCounter(1000, MAX_CHUNKS + 1),
    ).toThrow(RangeError);
  });

  it('should disallow less than two chunks', () => {
    expect(() => new SmoothlyDecayingRollingCounter(1000, 1)).toThrow(
      RangeError,
    );
  });

  it('should allow two chunks', () => {
    new SmoothlyDecayingRollingCounter(1000, 2);
  });
});
