export class TimeWindow {
  public readonly duration: number;
  protected currentSlotIndex: number;

  constructor(duration: number) {
    this.duration = duration;
    this.currentSlotIndex = 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected shift(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected resetPrevious(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected resetCurrent(): void {}

  protected update(currentTime: number): void {
    const currentIndex = Math.floor(currentTime / this.duration);
    const isCurrentSlot = currentIndex === this.currentSlotIndex;

    if (!isCurrentSlot) {
      const isNextSlot = currentIndex === this.currentSlotIndex + 1;

      if (isNextSlot) {
        this.shift();
      } else {
        this.resetPrevious();
      }

      this.resetCurrent();
      this.currentSlotIndex = currentIndex;
    }
  }
}
