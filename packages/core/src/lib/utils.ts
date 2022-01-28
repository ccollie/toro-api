export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function prop<T, K extends keyof T>(obj: T, key: K) {
  return obj[key];
}


