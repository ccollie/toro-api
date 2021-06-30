/**
 * Calculate Apdex for a sample.
 */
export class ApdexCalculator {
  public totalCount = 0;
  public satisfiedCount = 0;
  public toleratedCount = 0;
  public frustratedCount = 0;
  public readonly threshold: number;

  constructor(threshold: number) {
    this.threshold = threshold;
  }

  update(elapsedTime: number): void {
    // Increment the total count of samples
    this.totalCount++;

    if (elapsedTime <= this.threshold) {
      this.satisfiedCount++;
    } else if (
      elapsedTime > this.threshold &&
      elapsedTime < this.threshold * 4
    ) {
      this.toleratedCount++;
    } else {
      this.frustratedCount++;
    }
  }

  merge(other: ApdexCalculator): void {
    if (this.threshold !== other.threshold) {
      throw new Error('Can only merge apdexes of similar thresholds');
    }
    this.totalCount += other.totalCount;
    this.satisfiedCount += other.satisfiedCount;
    this.toleratedCount += other.toleratedCount;
    this.frustratedCount += other.frustratedCount;
  }

  subtract(other: ApdexCalculator): void {
    if (this.threshold !== other.threshold) {
      throw new Error('Can only subtract apdexes of similar thresholds');
    }
    if (other.totalCount > this.totalCount) {
      this.reset();
      return;
    }
    this.totalCount = Math.max(0, this.totalCount - other.totalCount);
    this.satisfiedCount = Math.max(
      0,
      this.satisfiedCount - other.satisfiedCount,
    );
    this.toleratedCount = Math.max(
      0,
      this.toleratedCount - other.toleratedCount,
    );
    this.frustratedCount = Math.max(
      0,
      this.frustratedCount - other.frustratedCount,
    );
  }

  reset(): void {
    this.toleratedCount = 0;
    this.totalCount = 0;
    this.satisfiedCount = 0;
    this.frustratedCount = 0;
  }

  getScore(): number {
    if (this.totalCount == 0) {
      return 0;
    }
    return (this.satisfiedCount + this.toleratedCount / 2) / this.totalCount;
  }
}
