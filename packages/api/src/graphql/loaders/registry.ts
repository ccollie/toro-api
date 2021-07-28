import DataLoader from 'dataloader';
import { getLoaderKeys, getLoaderMeta } from './factory';
import boom from '@hapi/boom';

/**
 * This allows data loaders to be registered together into a single place. It also allows
 * you to retrieve data loaders by name from a central place
 */
export class DataLoaderRegistry {
  private dataLoaders: Map<string, DataLoader<any, any, any>>;

  /**
   * This will register a new dataloader
   *
   * @param key        the key to put the data loader under
   * @param dataLoader the data loader to register
   * @return this registry
   */
  register(key: string, dataLoader: DataLoader<any, any>): this {
    this.dataLoaders.set(key, dataLoader);
    return this;
  }

  private createLoader<K = any, V = any, C = K>(
    key: string,
  ): DataLoader<K, V, C> {
    if (!this.dataLoaders) {
      this.dataLoaders = new Map<string, DataLoader<any, any, any>>();
    }
    const meta = getLoaderMeta(key);
    if (!meta) {
      throw boom.notImplemented(`No constructor found for loader "${key}"`);
    }

    const args = meta.dependencies.map((dependency) => {
      const resolved =
        this.dataLoaders.get(dependency) ??
        this.createLoader<K, V, C>(dependency);
      if (!resolved) {
        throw boom.notFound(
          `cannot find dependent data loader "${dependency}" of ${key}`,
        );
      }
      return resolved;
    });

    const loader = meta.ctor(...args) as DataLoader<K, V, C>;
    this.register(key, loader);
    return loader;
  }

  /**
   * Gets a data loader or creates and registers one if absent
   * <p>
   * @param key             the key of the data loader
   * @param <K>             the type of keys
   * @param <V>             the type of values
   * @param <C>             the type of cache key
   * @return a data loader
   */
  getLoader<K = any, V = any, C = K>(key: string): DataLoader<K, V, C> {
    let loader = this.dataLoaders?.get(key) as DataLoader<K, V, C>;
    if (!loader) {
      loader = this.createLoader<K, V, C>(key);
    }
    return loader;
  }

  load<K = any, V = any, C = K>(loaderId: string, key: K): Promise<V> {
    const loader = this.getLoader<K, V, C>(loaderId);
    return loader.load(key);
  }

  /**
   * @return the keys of the data loaders in this registry
   */
  public getKeys(): string[] {
    return getLoaderKeys();
  }
}
