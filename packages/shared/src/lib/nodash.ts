export function dropWhile<T>(
  array: T[],
  predicate: (value: T, index: number) => boolean,
): T[] {
  let i = 0;
  while (i < array.length && predicate(array[i], i)) {
    i++;
  }
  return array.slice(i);
}

export function uniqWith<T>(
  array: T[],
  predicate: (a: T, b: T, index?: number) => boolean,
): T[] {
  const result: T[] = [];
  for (let i = 0; i < array.length; i++) {
    const value = array[i];
    if (result.every((v) => !predicate(v, value, i))) {
      result.push(value);
    }
  }
  return result;
}

export function initial<T>(array: T[]): T[] {
  return !array?.length ? [] : array.slice(0, array.length - 1);
}

export function take<T>(array: T[], n: number): T[] {
  return array?.length ? array.slice(0, n) : [];
}

export function get(
  obj: any,
  path: string | string[],
  defaultValue: unknown = undefined,
): any {
  if (!obj) {
    return defaultValue;
  }

  const travel = (regexp: RegExp) => {
    if (Array.isArray(path)) {
      return path.filter(Boolean).reduce((obj, key) => obj?.[key], obj);
    }
    return String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce(
        (res, key) => (res !== null && res !== undefined ? res[key] : res),
        obj,
      );
  };
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
}

export function first<T>(items: T[]): T | undefined {
  return items.length ? items[0] : undefined;
}

export function last<T>(items: T[]): T | undefined {
  return items.length ? items[items.length - 1] : undefined;
}

export function flatMap<T, U>(array: T[], mapFunc: (x: T) => U[]): U[] {
  return array.reduce(
    (cumulus: U[], next: T) => [...mapFunc(next), ...cumulus],
    <U[]>[],
  );
}
