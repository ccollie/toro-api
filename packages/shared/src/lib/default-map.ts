
export class DefaultMap<TKey, TValue> extends Map<TKey, TValue> {
    constructor(private defaultValue: ((k?: TKey) => TValue),
              values?: Iterable<readonly [TKey, TValue]>) {
      super(values);
    }

    public get(key: TKey): TValue {
        if (!this.has(key)) {
            this.set(key, this.createDefaultValue(key));
        }
        return super.get(key);
    }

    peek(key: TKey): TValue {
        return super.get(key);
    }

    protected createDefaultValue(key: TKey): TValue {
        return (typeof this.defaultValue === 'function') ?
          this.defaultValue(key) : this.defaultValue;
    }
}
