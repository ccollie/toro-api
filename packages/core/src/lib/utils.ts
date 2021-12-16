export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const isPrimitive = (val: unknown) => {
  if (val === null) {
    return true;
  }
  return !(typeof val == 'object' || typeof val == 'function');
};
