import { isNil } from '@alpen/shared';

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function prop<T, K extends keyof T>(obj: T, key: K) {
  return obj[key];
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function reverseString(src: string): string {
  let dst = '';
  for (let i = src.length - 1; i >= 0; i--) {
    dst = dst + src[i];
  }
  return dst;
}

export function strCmp(a: string, b: string): number {
  if (isNil(a)) {
    if (isNil(b)) return 0;
    a = '';
  }
  if (isNil(b)) {
    return 1;
  }
  return a === b ? 0 : a < b ? -1 : 1;
}
