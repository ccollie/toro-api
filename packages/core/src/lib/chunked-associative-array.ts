import { binarySearch } from './binary-search';
import Denque from 'denque';

class Chunk<TKey = number, TValue = any> {
  readonly keys: TKey[];
  readonly values: TValue[];

  public chunkSize: number; // can differ from keys.length after half clear()
  public startIndex = 0;
  public cursor = 0;

  constructor(chunkSize: number) {
    this.chunkSize = chunkSize;
    this.keys = new Array<TKey>(chunkSize);
    this.values = new Array<TValue>(chunkSize);
  }

  get length(): number {
    return this.cursor - this.startIndex;
  }

  get isEmpty(): boolean {
    return this.cursor === this.startIndex;
  }

  get isFull(): boolean {
    return this.length === this.chunkSize;
  }

  get firstKey(): TKey {
    return this.keys[this.startIndex];
  }

  get lastKey(): TKey {
    return this.keys[this.cursor - 1];
  }

  isLastElementLessThanKey(key: TKey): boolean {
    return this.isEmpty || this.lastKey < key;
  }

  isFirstElementEmptyOrGreaterEqualThanKey(key: TKey): boolean {
    return this.isEmpty || this.firstKey >= key;
  }

  findFirstIndexOfGreaterEqualElements(minKey: TKey): number {
    const array = this.keys;
    const startIndex = this.startIndex;
    const endIndex = this.cursor;
    if (endIndex == startIndex || array[startIndex] >= minKey) {
      return startIndex;
    }
    const keyIndex = binarySearch(array, minKey, startIndex, endIndex);
    return keyIndex < 0 ? -(keyIndex + 1) : keyIndex;
  }

  append(key: TKey, value: TValue): void {
    this.keys[this.cursor] = key;
    this.values[this.cursor] = value;
    this.cursor++;
  }

  copyValues(dest: TValue[], count: number, valueIndex: number): void {
    // todo: splice
    for (let i = this.startIndex; i < this.cursor && count > 0; i++, count--) {
      dest[valueIndex++] = this.values[i];
    }
  }
}

const DEFAULT_CHUNK_SIZE = 256;
const MAX_CACHE_SIZE = 64;

export interface ChunkedAssociativeArrayRange<TKey = any> {
  startKey?: TKey;
  endKey?: TKey;
}

export class ChunkedAssociativeArray<TKey = number, TValue = TKey> {
  private readonly defaultChunkSize: number;

  /*
   * We use this Deque as cache to store chunks that are expired and removed from
   * main data structure. Then instead of allocating a new Chunk immediately we are trying
   * to pull one from this deque. So if you have constant or slowly changing load
   * ChunkedAssociativeArray will never throw away old chunks or allocate new ones which
   * makes this data structure almost garbage free.
   */
  private readonly chunksCache = new Denque<Chunk<TKey, TValue>>();

  private readonly chunks = new Denque<Chunk<TKey, TValue>>();

  constructor(chunkSize = DEFAULT_CHUNK_SIZE) {
    this.defaultChunkSize = chunkSize;
  }

  private allocateChunk(): Chunk<TKey, TValue> {
    const chunk = this.chunksCache.peekBack();
    if (!chunk) {
      return new Chunk<TKey, TValue>(this.defaultChunkSize);
    } else {
      chunk.cursor = 0;
      chunk.startIndex = 0;
      chunk.chunkSize = chunk.keys.length;
      return chunk;
    }
  }

  private freeChunk(chunk: Chunk<TKey, TValue>): void {
    if (this.chunksCache.length < MAX_CACHE_SIZE) {
      this.chunksCache.push(chunk);
    }
  }

  private forEachChunk(handler: (chunk: Chunk<TKey, TValue>) => void) {
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks.get(i);
      chunk && handler(chunk);
    }
  }

  put(key: TKey, value: TValue): boolean {
    let activeChunk = this.chunks.peekBack();
    if (activeChunk && activeChunk.cursor !== 0 && activeChunk.lastKey > key) {
      // key should be the same as last inserted or bigger
      return false;
    }
    if (!activeChunk || activeChunk.isFull) {
      // The last chunk doesn't exist or full
      activeChunk = this.allocateChunk();
      this.chunks.push(activeChunk);
    }
    activeChunk.append(key, value);
    return true;
  }

  private findIndex(startKey: TKey): [number, number] {
    let found = false;
    const len = this.chunks.length;
    for (let i = 0; i < len && !found; i++) {
      const chunk = this.chunks.get(i);
      if (!chunk) {
        continue;
      }
      let startIndex = chunk.startIndex;
      if (!found) {
        if (chunk.isEmpty) {
          found = true;
        } else if (startKey > chunk.lastKey) {
          continue;
        } else {
          // startKey <= chunk.lastKey
          found = true;
          startIndex = chunk.findFirstIndexOfGreaterEqualElements(startKey);
        }
      }
      return [i, startIndex];
    }
    return [len, -1];
  }

  getValues(startKey?: TKey, endKey?: TKey): TValue[] {
    let foundStart = false;

    const argCount = arguments.length;
    if (argCount === 0) {
      // fast path
      const valuesSize = this.length;
      const values = new Array<TValue>(valuesSize);
      let valuesIndex = 0;
      this.forEachChunk((chunk) => {
        const length = chunk.length;
        const itemsToCopy = Math.min(valuesSize - valuesIndex, length);
        chunk.copyValues(values, itemsToCopy, valuesIndex);
        valuesIndex += length;
      });
      return values;
    }

    if (argCount < 2) endKey = this.lastKey;
    if (argCount < 1) startKey = this.firstKey;

    const result: TValue[] = [];

    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks.get(i);
      if (!chunk) continue;

      let startIndex = chunk.startIndex;
      if (!foundStart) {
        if (chunk.isEmpty) {
          foundStart = true;
        } else if (startKey > chunk.lastKey) {
          continue;
        } else {
          // startKey <= chunk.lastKey
          foundStart = true;
          startIndex = chunk.findFirstIndexOfGreaterEqualElements(startKey);
        }
      }

      if (endKey >= chunk.lastKey && startIndex == 0) {
        const items = chunk.values.slice(0, chunk.length);
        result.push(...items);
      } else {
        for (let j = startIndex; j < chunk.cursor; j++) {
          if (chunk.keys[j] > endKey) {
            break;
          } else {
            result.push(chunk.values[j]);
          }
        }
      }
    }

    return result;
  }

  forEach(
    range: ChunkedAssociativeArrayRange,
    callback: ([ts, value], index?: number) => void,
  ): void {
    let i = 0;
    const { startKey, endKey } = range;
    for (const [ts, value] of this.range(startKey, endKey)) {
      callback([ts, value], i++);
    }
  }

  reduce<TAccumulator = any>(
    range: ChunkedAssociativeArrayRange,
    callback: (
      acc: TAccumulator,
      value,
      ts?: TKey,
      index?: number,
    ) => TAccumulator,
    init: TAccumulator,
  ): TAccumulator {
    let i = 0;
    const { startKey, endKey } = range;
    let accumulator = init;
    for (const [ts, value] of this.range(startKey, endKey)) {
      accumulator = callback(accumulator, value, ts, i++);
    }
    return accumulator;
  }

  *range(startKey?: TKey, endKey?: TKey): IterableIterator<[TKey, TValue]> {
    let foundStart = false;

    if (arguments.length < 2) endKey = this.lastKey;
    if (arguments.length < 1) startKey = this.firstKey;

    for (let k = 0; k < this.chunks.length; k++) {
      const chunk = this.chunks.get(k);
      if (!chunk) continue;

      let startIndex = chunk.startIndex;
      if (!foundStart) {
        if (chunk.isEmpty) {
          foundStart = true;
        } else if (startKey > chunk.lastKey) {
          continue;
        } else {
          // startKey <= chunk.lastKey
          foundStart = true;
          startIndex = chunk.findFirstIndexOfGreaterEqualElements(startKey);
        }
      }

      for (let i = startIndex; i < chunk.cursor; i++) {
        const value = chunk.values[i];
        const key = chunk.keys[i];
        if (key > endKey) {
          break;
        }
        yield [key, value];
      }
    }
  }

  get length(): number {
    return this.size();
  }

  size(): number {
    let result = 0;
    for (let k = 0; k < this.chunks.length; k++) {
      const chunk = this.chunks.get(k);
      result += chunk?.length;
    }
    return result;
  }

  get firstKey(): TKey | undefined {
    const chunk = this.chunks.peekFront();
    return chunk && chunk.firstKey;
  }

  get lastKey(): TKey | undefined {
    const chunk = this.chunks.peekBack();
    return chunk && chunk.lastKey;
  }

  out(): string {
    const builder = [];
    for (let i = 0; i < this.chunks.length; i++) {
      builder.push('[');
      const chunk = this.chunks.get(i);
      if (!chunk) continue;
      for (let i = chunk.startIndex; i < chunk.cursor; i++) {
        builder.push('(', chunk.keys[i], ': ', chunk.values[i], ')', ' ');
      }
      builder.push(']');
      if (i < this.chunks.length - 1) {
        builder.push('->');
      }
    }
    return builder.join('');
  }

  /**
   * Try to trim all beyond specified boundaries.
   *
   * @param startKey the start value for which all elements less than it should be removed.
   * @param endKey   the end value for which all elements greater/equals than it should be removed.
   */
  trim(startKey: TKey, endKey?: TKey): this {
    /*
     * [3, 4, 5, 9] -> [10, 13, 14, 15] -> [21, 24, 29, 30] -> [31] :: start layout
     *       |5______________________________23|                    :: trim(5, 23)
     *       [5, 9] -> [10, 13, 14, 15] -> [21]                     :: result layout
     */
    if (arguments.length > 1) {
      while (!this.chunks.isEmpty()) {
        const chunk = this.chunks.peekBack();
        if (!chunk) continue;
        if (chunk.isFirstElementEmptyOrGreaterEqualThanKey(endKey)) {
          this.freeChunk(this.chunks.pop());
        } else {
          chunk.cursor = chunk.findFirstIndexOfGreaterEqualElements(endKey);
          break;
        }
      }
    }

    while (!this.chunks.isEmpty()) {
      const chunk = this.chunks.peekFront();
      if (!chunk) continue;
      if (chunk.isLastElementLessThanKey(startKey)) {
        this.freeChunk(this.chunks.shift());
      } else {
        const newStartIndex =
          chunk.findFirstIndexOfGreaterEqualElements(startKey);
        if (chunk.startIndex != newStartIndex) {
          chunk.startIndex = newStartIndex;
          chunk.chunkSize = chunk.length;
        }
        break;
      }
    }

    return this;
  }

  clear(): this {
    this.chunks.clear();
    return this;
  }
}
