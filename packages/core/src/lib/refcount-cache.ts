/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 */

type ResourceCacheEntry<T> = {
  refs: number;
  state: T;
};

export type CacheCleanupMethod<T> = (path: string, entry: T) => void;
export type CacheItemCreateMethod<T> = (path: string) => T;

export interface RefCountCacheOptions<T> {
  cleanup?: CacheCleanupMethod<T>;
  create?: CacheItemCreateMethod<T>;
}
/**
 * RefCountCache is a basic cache that stores entries as long as there is an
 * external reference to them. When no objects remain referencing the cached
 * value, the entry is ejected.
 */
export class RefCountCache<T> {
  private readonly _cleanup?: CacheCleanupMethod<T>;
  private readonly _create?: CacheItemCreateMethod<T>;
  private readonly _stateCache = new Map<string, ResourceCacheEntry<T>>();

  constructor(options?: RefCountCacheOptions<T>) {
    this._cleanup = options?.cleanup;
    this._create = options?.create;
  }

  has(path: string): boolean {
    return this._stateCache.has(path);
  }

  private create(path: string): ResourceCacheEntry<T> {
    if (this._create) {
      const created = this._create(path);
      if (created) {
        this.addEntry(path, created);
        return this._stateCache.get(path);
      }
    }
    return null;
  }

  get(path: string): T {
    const entry = this._stateCache.get(path) || this.create(path);
    if (!entry) {
      throw new Error(`RefCountCache entry for ${path} not found`);
    }
    return entry.state;
  }

  getRef(path: string): T {
    const prev = this._stateCache.get(path);
    if (prev) {
      prev.refs++;
      return prev.state;
    }
    const created = this.create(path);
    return created ? created.state : null;
  }

  addEntry(path: string, state: T): void {
    const prev = this._stateCache.get(path);
    if (prev) {
      return;
    }
    this._stateCache.set(path, {
      refs: 1,
      state: state,
    });
  }

  addReference(path: string): number {
    const prev = this._stateCache.get(path);
    if (!prev) {
      return 0;
    }
    prev.refs++;
    return prev.refs;
  }

  removeReference(path: string): number {
    const prev = this._stateCache.get(path);
    if (!prev) {
      return 0;
    }
    prev.refs--;
    if (prev.refs <= 0) {
      if (this._cleanup) {
        this._cleanup(path, prev.state);
      }
      this._stateCache.delete(path);
    }
    return Math.max(0, prev.refs);
  }
}
