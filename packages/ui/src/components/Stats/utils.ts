import prettyMilliseconds from 'pretty-ms';

export function statsDurationFormat(value: undefined | string | number): string {
  if (typeof value === 'undefined') {
    return '';
  }
  if (typeof value !== 'number') {
    value = parseInt(value, 10);
  }
  return prettyMilliseconds(value, { compact: false });
}

export function statsRateFormat(rate: number | undefined, unit = 'min') {
  if (rate === undefined) return '-';
  if (rate === 0) return '0';
  return `${rate.toFixed(2)}${unit && '/' + unit}`;
}
