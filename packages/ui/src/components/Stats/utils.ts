import { MantineSize } from '@mantine/core';
import prettyMilliseconds from 'pretty-ms';

export function statsDurationFormat(
  value: undefined | string | number,
): string {
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

/**
 * Props where only the prop key is used in the className.
 * @param {*} val A props value
 * @param {string} key A props key
 *
 * @example
 * <Label tag />
 * <div class="ui tag label"></div>
 */
export const useKeyOnly = (val: any, key: string) => val && key;

/**
 * Props that require both a key and value to create a className.
 * @param {*} val A props value
 * @param {string} key A props key
 *
 * @example
 * <Label corner='left' />
 * <div class="ui left corner label"></div>
 */
export const useValueAndKey = (val: any, key: string) =>
  val && val !== true && `${val} ${key}`;

/**
 * Props whose key will be used in className, or value and key.
 * @param {*} val A props value
 * @param {string} key A props key
 *
 * @example Key Only
 * <Label pointing />
 * <div class="ui pointing label"></div>
 *
 * @example Key and Value
 * <Label pointing='left' />
 * <div class="ui left pointing label"></div>
 */
export const useKeyOrValueAndKey = (val: unknown, key: string) =>
  val && (val === true ? key : `${val} ${key}`);

//
// Prop to className exceptions
//

/**
 * The "textAlign" prop follows the useValueAndKey except when the value is "justified'.
 * In this case, only the class "justified" is used, ignoring the "aligned" class.
 * @param {*} val The value of the "textAlign" prop
 *
 * @example
 * <Container textAlign='justified' />
 * <div class="ui justified container"></div>
 *
 * @example
 * <Container textAlign='left' />
 * <div class="ui left aligned container"></div>
 */
export const useTextAlignProp = (val: any) =>
  val === 'justified' ? 'justified' : useValueAndKey(val, 'aligned');

/**
 * The "verticalAlign" prop follows the useValueAndKey.
 *
 * @param {*} val The value of the "verticalAlign" prop
 *
 * @example
 * <Grid verticalAlign='middle' />
 * <div class="ui middle aligned grid"></div>
 */
export const useVerticalAlignProp = (val: any) =>
  useValueAndKey(val, 'aligned');

export const numberToWordMap: Record<number, string> = {
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
  10: 'ten',
  11: 'eleven',
  12: 'twelve',
  13: 'thirteen',
  14: 'fourteen',
  15: 'fifteen',
  16: 'sixteen',
};

/**
 * Return the number word for numbers 1-16.
 * Returns strings or numbers as is if there is no corresponding word.
 * Returns an empty string if value is not a string or number.
 * @param {string|number} value The value to convert to a word.
 * @returns {string}
 */
export function numberToWord(value: string | number) {
  const type = typeof value;
  if (type === 'number') {
    // @ts-ignore
    return numberToWordMap[value] || value.toString();
  }
  return value;
}

// todo: convert sizes

/**
 * Create "X", "X wide" and "equal width" classNames.
 * "X" is a numberToWord value and "wide" is configurable.
 * @param {*} val The prop value
 * @param {string} [widthClass=''] The class
 * @param {boolean} [canEqual=false] Flag that indicates possibility of "equal" value
 *
 * @example
 * <Grid columns='equal' />
 * <div class="ui equal width grid"></div>
 *
 * <Form widths='equal' />
 * <div class="ui equal width form"></div>
 *
 * <FieldGroup widths='equal' />
 * <div class="equal width fields"></div>
 *
 * @example
 * <Grid columns={4} />
 * <div class="ui four column grid"></div>
 */
export const useWidthProp = (val: any, widthClass = '', canEqual = false) => {
  if (canEqual && val === 'equal') {
    return 'equal width';
  }
  const valType = typeof val;
  if ((valType === 'string' || valType === 'number') && widthClass) {
    return `${numberToWord(val)} ${widthClass}`;
  }
  return numberToWord(val);
};

// todo: use a map
export function useSizeProp(size?: MantineSize): string {
  if (!size) {
    return '';
  }
  switch (size) {
    case 'xs': return 'small';
    case 'sm': return 'medium';
    case 'md': return 'large';
    case 'lg': return 'huge';
    case 'xl': return 'huge';
  }
}
