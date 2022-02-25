export const ONE_SECOND = 1000;
export const ONE_MINUTE = 60 * ONE_SECOND;
export const ONE_HOUR = 60 * ONE_MINUTE;
export const ONE_DAY = 24 * ONE_HOUR;

export const DefaultTimeWindows: number[] = [
  //ONE_SECOND * 30,
  ONE_MINUTE,
  ONE_MINUTE * 5,
  ONE_MINUTE * 10,
  ONE_MINUTE * 15,
  ONE_MINUTE * 30,
  ONE_HOUR,
  ONE_HOUR * 2,
  ONE_HOUR * 4,
  ONE_DAY,
];
