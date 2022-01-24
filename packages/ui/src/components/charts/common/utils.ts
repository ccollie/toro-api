import { StatsSnapshot } from '@/types';

export function trimLabel(s: any, max = 16): string {
  if (typeof s !== 'string') {
    if (typeof s === 'number') {
      return s + '';
    } else {
      return '';
    }
  }

  s = s.trim();
  if (s.length <= max) {
    return s;
  } else {
    return `${s.slice(0, max)}...`;
  }
}

/**
 * Formats a label given a date, number or string.
 *
 * @export
 */
export function formatLabel(label: any): string {
  if (label instanceof Date) {
    label = label.toLocaleDateString();
  } else {
    label = label.toLocaleString();
  }

  return label;
}

/**
 * Escapes a label.
 *
 * @export
 */
export function escapeLabel(label: any): string {
  return label.toLocaleString().replace(/[&'`"<>]/g, (match: string | number) => {
    // @ts-ignore
    return {
      '&': '&amp;',
      // tslint:disable-next-line: quotemark
      "'": '&#x27;',
      '`': '&#x60;',
      '"': '&quot;',
      '<': '&lt;',
      '>': '&gt;'
    }[match];
  });
}


// quick equality check for arrays of StatsSnapshot. We assume that they are sorted by time.
export function isStatsSnapshotEqual(a: StatsSnapshot[], b: StatsSnapshot[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  if (a.length === 0) {
    return true;
  }

  const last = a.length - 1;
  return !(a[0].startTime !== b[0].startTime || a[last].endTime !== b[last].endTime);
}
