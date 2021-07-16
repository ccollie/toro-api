/**
 * An incrementing and decrementing counter metric having window semantics.
 *
 * @see SmoothlyDecayingRollingCounter
 * @see ResetOnSnapshotCounter
 * @see ResetPeriodicallyCounter
 */
export interface WindowCounter {
  /**
   * Increment the counter by {@code delta}.
   * If You want to decrement instead of increment then use negative {@code delta}.
   *
   * @param delta the amount by which the counter will be increased
   */
  add(delta: number, currentTimeMillis?: number): void;

  /**
   * Returns the counter's current value.
   *
   * @return the counter's current value
   */
  getSum(currentTimeMillis?: number): number;
}
