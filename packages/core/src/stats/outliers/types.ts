export enum OutlierMethod {
  MAD = 'MAD',
  IQR = 'IQR',
  Sigma = 'Sigma',
}

export interface OutlierOptions {
  threshold?: number;
  /** Is the input sorted */
  sorted?: boolean;
}

export type OutlierPredicate = (value: number) => boolean;

export type OutlierDetectorConstructor = (
  arr: number[],
  opts?: OutlierOptions,
) => OutlierPredicate;

export function getOpts(opts?: OutlierOptions): OutlierOptions {
  opts = {
    sorted: false,
    ...(opts || {}),
  };
  return opts;
}
