// https://github.com/atlassubbed/atlas-median
export function median(arr: number[], isSorted = false): number {
  const n = arr.length;
  // short circuit all edge cases
  if (!n) return;
  if (n === 1) return arr[0];
  if (n === 2) return (arr[0] + arr[1]) / 2;
  const h = n / 2;
  if (!isSorted) {
    arr = arr.slice(0).sort((a, b) => a - b);
  }
  return n % 2 ? arr[Math.floor(h)] : (arr[h - 1] + arr[h]) / 2;
}
