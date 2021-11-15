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
import { systemClock } from '../lib';
import { WindowCounter } from './window-counter';

// meaningful limits to disallow user to kill performance(or memory footprint) by mistake
export const MAX_CHUNKS = 1000;
export const MIN_CHUNK_RESETTING_INTERVAL_MILLIS = 100;
export const MAX_VALUE = Number.MAX_SAFE_INTEGER;

/**
 * The rolling time window counter implementation which resets its state by chunks.
 *
 * The unique properties which make this counter probably the best "rolling time window"
 * implementation:
 * <ul>
 *     <li>Sufficient performance with tens of millions concurrent writes and reads per second.</li>
 *     <li>Predictable and low memory consumption. The memory consumed does not depend
 *     on the amount and frequency of writes.</li>
 *     <li>Perfect user experience, the continuous observation does not see sudden changes of sum.
 *     This property achieved by smoothly decaying of oldest chunk of counter.
 *     </li>
 * </ul>
 *
 * <p>
 * Concurrency properties:
 * <ul>
 *     <li>Writing is lock-free.
 *     <li>Sum reading is lock-free.
 * </ul>
 *
 * <p>
 * Usage recommendations:
 * <ul>
 *     <li>Only when you need a "rolling time window" semantic.</li>
 * </ul>
 *
 * <p>
 * Performance considerations:
 * <ul>
 *     <li>You can consider writing speed as a constant. The write latency does not depend on
 *     the number of chunks or the frequency of chunk rotation. </li>
 *     <li>The writing depends only on the level of contention between writers.</li>
 *     <li>The huge count of chunk leads to slower sum calculation. So the precision of the
 *     sum conflicts with latency of sum. You need to choose meaningful values.
 *     For example 10 chunks will guarantee at least 90% accuracy and ten million reads
 *     per second.</li>
 * </ul>
 *
 * <p> Example of usage:
 * <pre><code>
 *         // constructs the counter which divided by 10 chunks with 60 seconds time window.
 *         // one chunk will be reset to zero after each 6 second,
 *         const counter = new SmoothlyDecayingRollingCounter(Duration.ofSeconds(60), 10);
 *         counter.add(42);
 *     </code>
 * </pre>
 */
export class SmoothlyDecayingRollingCounter implements WindowCounter {
  readonly intervalBetweenResettingMillis: number;
  private lastWrite: number;
  creationTimestamp: number;
  readonly chunks: Chunk[];

  /**
   * Constructs the chunked counter divided by {@code numberChunks}.
   * The counter will invalidate one chunk each time when {@code rollingWindow/numberChunks} millis
   * has elapsed, except oldest chunk which invalidated continuously.
   * The memory consumed by counter and latency of sum calculation depends directly
   * on {@code numberChunks}
   *
   * <p> Example of usage:
   * <pre><code>
   *         // constructs the counter which divided by 10 chunks with 60 seconds time window.
   *         // one chunk will be reset to zero after each 6 second,
   *         WindowCounter counter = new SmoothlyDecayingRollingCounter(Duration.ofSeconds(60), 10);
   *         counter.add(42);
   *     </code>
   * </pre>
   *
   * @param rollingWindow the rolling time window duration
   * @param numberChunks The count of chunk to split counter
   */

  constructor(rollingWindow: number, numberChunks: number) {
    if (numberChunks < 2) {
      throw new RangeError('numberChunks should be >= 2');
    }

    if (numberChunks > MAX_CHUNKS) {
      throw new RangeError('number of chunks should be <=' + MAX_CHUNKS);
    }

    this.intervalBetweenResettingMillis = rollingWindow / numberChunks;
    if (
      this.intervalBetweenResettingMillis < MIN_CHUNK_RESETTING_INTERVAL_MILLIS
    ) {
      // eslint-disable-next-line max-len
      throw new RangeError(
        'intervalBetweenResettingMillis should be >=' +
          MIN_CHUNK_RESETTING_INTERVAL_MILLIS,
      );
    }

    this.chunks = new Array<Chunk>(numberChunks + 1);
    for (let i = 0; i < this.chunks.length; i++) {
      this.chunks[i] = new Chunk(this, i);
    }
  }

  /**
   * @return the rolling window duration for this counter
   */
  get rollingWindow(): number {
    return (this.chunks.length - 1) * this.intervalBetweenResettingMillis;
  }

  /**
   * @return the number of chunks
   */
  get chunkCount(): number {
    return this.chunks.length - 1;
  }

  private getChunkIndex(nowMillis: number): number {
    const millisSinceCreation =
      nowMillis - (this.creationTimestamp ?? nowMillis);
    const intervalsSinceCreation =
      millisSinceCreation / this.intervalBetweenResettingMillis;
    return Math.floor(intervalsSinceCreation % this.chunks.length);
  }

  add(delta: number, ts: number): void {
    const nowMillis = ts ?? systemClock.getTime();
    this.creationTimestamp = this.creationTimestamp ?? nowMillis;
    const chunkIndex = this.getChunkIndex(nowMillis);
    this.chunks[chunkIndex].add(delta, nowMillis);
    this.lastWrite = ts;
  }

  getSum(currentTimeMillis?: number): number {
    currentTimeMillis = currentTimeMillis ?? this.lastWrite;

    // To get as fresh value as possible we need to calculate sum in order from oldest to newest
    const newestChunkIndex = this.getChunkIndex(currentTimeMillis);

    let sum = 0;
    for (
      let i = newestChunkIndex + 1, iteration = 0;
      iteration < this.chunks.length;
      i++, iteration++
    ) {
      if (i == this.chunks.length) {
        i = 0;
      }
      const chunk = this.chunks[i];
      sum += chunk.getSum(currentTimeMillis);
    }
    return sum;
  }

  toString(): string {
    return (
      'SmoothlyDecayingRollingCounter{' +
      ', intervalBetweenResettingMillis=' +
      this.intervalBetweenResettingMillis +
      ', creationTimestamp=' +
      this.creationTimestamp +
      `, chunks=(${this.chunks.join(',')})}`
    );
  }
}

class Chunk {
  private left: Phase;
  private right: Phase;
  private readonly chunkIndex: number;
  private readonly counter: SmoothlyDecayingRollingCounter;

  private currentPhase: Phase;

  constructor(counter: SmoothlyDecayingRollingCounter, chunkIndex: number) {
    this.counter = counter;
    this.chunkIndex = chunkIndex;
  }

  private initPhases() {
    if (!this.left) {
      const interval = this.counter.intervalBetweenResettingMillis;
      const invalidationTimestamp =
        this.counter.creationTimestamp +
        (this.counter.chunks.length + this.chunkIndex) * interval;
      this.left = new Phase(invalidationTimestamp, interval);
      this.right = new Phase(MAX_VALUE, interval);
      this.currentPhase = this.left;
    }
  }

  getSum(currentTimeMillis: number): number {
    if (!this.currentPhase) this.initPhases();
    return this.currentPhase.getSum(currentTimeMillis);
  }

  add(delta: number, currentTimeMillis: number): void {
    if (!this.currentPhase) this.initPhases();
    const currentPhase = this.currentPhase;
    const currentPhaseProposedInvalidationTimestamp =
      currentPhase.proposedInvalidationTimestamp;

    if (currentTimeMillis < currentPhaseProposedInvalidationTimestamp) {
      if (currentPhaseProposedInvalidationTimestamp != MAX_VALUE) {
        // this is main path - there are no rotation in the middle and
        // we are writing to non-expired phase
        currentPhase.add(delta);
      } else {
        // another thread is in the middle of phase rotation.
        // We need to re-read current phase to be sure that we are not writing to inactive phase
        this.currentPhase.add(delta);
      }
    } else {
      // we need to flip the phases
      const expiredPhase = currentPhase;

      // write to next phase because current is expired
      const nextPhase = expiredPhase == this.left ? this.right : this.left;
      nextPhase.add(delta);

      // try flip phase
      this.currentPhase = nextPhase;
      // Prepare expired phase to next iteration
      expiredPhase.reset();
      expiredPhase.proposedInvalidationTimestamp = MAX_VALUE;

      const { creationTimestamp, intervalBetweenResettingMillis, chunks } =
        this.counter;
      // allow next phase to be expired
      const millisSinceCreation = currentTimeMillis - creationTimestamp;
      const intervalsSinceCreation =
        millisSinceCreation / intervalBetweenResettingMillis;
      nextPhase.proposedInvalidationTimestamp =
        creationTimestamp +
        (intervalsSinceCreation + chunks.length) *
          intervalBetweenResettingMillis;
    }
  }

  toString() {
    return `Chunk{currentPhaseRef=${this.currentPhase}}`;
  }
}

class Phase {
  private total = 0;
  private readonly intervalBetweenResettingMillis: number;
  public proposedInvalidationTimestamp: number;

  constructor(proposedInvalidationTimestamp: number, intervalReset: number) {
    this.intervalBetweenResettingMillis = intervalReset;
    this.proposedInvalidationTimestamp = proposedInvalidationTimestamp;
  }

  getSum(currentTimeMillis: number): number {
    const proposedInvalidationTimestamp = this.proposedInvalidationTimestamp;
    if (currentTimeMillis >= proposedInvalidationTimestamp) {
      // The chunk was unused by writers for a long time
      return 0;
    }

    let sum = this.total;

    // if this is the oldest chunk then we need to reduce its weight
    const beforeInvalidateMillis =
      proposedInvalidationTimestamp - currentTimeMillis;
    if (beforeInvalidateMillis < this.intervalBetweenResettingMillis) {
      const decayingCoefficient =
        beforeInvalidateMillis / this.intervalBetweenResettingMillis;
      sum = Math.ceil(sum * decayingCoefficient);
    }

    return sum;
  }

  add(value: number) {
    this.total += value;
  }

  reset() {
    this.total = 0;
  }

  public toString(): string {
    // eslint-disable-next-line max-len
    return `Phase{sum=${this.total}, proposedInvalidationTimestamp=${this.proposedInvalidationTimestamp}}`;
  }
}
