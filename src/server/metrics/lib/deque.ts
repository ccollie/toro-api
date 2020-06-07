import DequeueBase from 'double-ended-queue';

export class Deque extends DequeueBase {
  private _front: number;
  private _length: number;
  private _capacity: number;
  constructor(...args) {
    super(...args);
  }

  set(index: number, value: any) {
    let i = index;
    if (i !== (i | 0)) {
      throw new RangeError(`Index ${i} is invalid`);
    }
    const len = this._length;
    if (i < 0) {
      i = i + len;
    }
    if (i < 0 || i >= len) {
      throw new RangeError(`Index ${i} is out of bounds`);
    }
    this[(this._front + i) & (this._capacity - 1)] = value;
  }
}
