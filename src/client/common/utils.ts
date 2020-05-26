// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function noop() {}

export function isObject(item): boolean {
  return typeof item === 'object' && !Array.isArray(item);
}

export function isEmpty(obj): boolean {
  return !obj || (Object.keys(obj).length === 0 && obj.constructor === Object);
}

export function isDate(date): boolean {
  return !!date && Object.prototype.toString.call(date) === '[object Date]';
}

export function isFunction(fn): boolean {
  return typeof fn === 'function';
}

export function isString(str): boolean {
  return str && typeof str === 'string';
}
export const capitalize = (name) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1) : '';

export function safeParse(item): any {
  try {
    if (!isString(item) || !item.length) {
      return item;
    }
    return JSON.parse(item);
  } catch (e) {
    return item;
  }
}

export function log(message): void {
  console.log(message);
}

export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function chunk(array, size: number): any[] {
  const chunked = [];
  let index = 0;
  while (index < array.length) {
    chunked.push(array.slice(index, size + index));
    index += size;
  }
  return chunked;
}

export function joinPath(...parts): string {
  let base = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    base = base + (part[0] !== '/' ? '/' : '') + part;
  }
  return base;
}
