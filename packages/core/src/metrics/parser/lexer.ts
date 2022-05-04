import { scanBinaryOpPrefix } from '../lib/binary-op';

export class Lexer {
  // Token contains the currently parsed token.
  // An empty token means EOF.
  token: string;

  protected prevTokens: string[];
  protected nextTokens: string[];

  protected sOrig: string;
  sTail: string;

  err: Error;

  constructor(s: string) {
    this.token = '';
    this.prevTokens = [];
    this.nextTokens = [];
    this.err = null;

    this.sOrig = s;
    this.sTail = s;
  }

  get context() {
    return `${this.token}${this.sTail}`;
  }

  get isEOF() {
    return !this.token;
  }

  next() {
    this.prevTokens.push(this.token);
    if (this.nextTokens.length > 0) {
      this.token = this.nextTokens[this.nextTokens.length - 1];
      this.nextTokens = this.nextTokens.slice(0, this.nextTokens.length - 1);
      return null;
    }
    this.token = this._next();
  }

  prev() {
    this.nextTokens.push(this.token);
    this.token = this.prevTokens[this.prevTokens.length - 1];
    this.prevTokens = this.prevTokens.slice(0, this.prevTokens.length - 1);
  }

  _next(): string {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const lex = this;

    let s = skipWhitespace(this.sTail);
    lex.sTail = s;

    let token: string;

    function tokenFound() {
      lex.sTail = s.slice(token.length);
      return token;
    }

    switch (s[0]) {
      case '#': {
        // Skip comment till the end of string
        s = s.slice(1);
        const n = s.indexOf('\n');
        if (n < 0) {
          return '';
        }
        lex.sTail = s.slice(n + 1);
        // goto again
        break;
      }
      case '{':
      case '}':
      case '[':
      case ']':
      case '(':
      case ')':
      case ',':
      case '@':
        token = s.slice(0, 1);
        return tokenFound();
    }

    if (isIdentPrefix(s)) {
      token = scanIdent(s);
      return tokenFound();
    }
    if (isStringPrefix(s)) {
      token = scanString(s);
      return tokenFound();
    }
    let n: number;
    if ((n = scanBinaryOpPrefix(s)) > 0) {
      token = s.slice(0, n);
      return tokenFound();
    }
    if ((n = scanTagFilterOpPrefix(s)) > 0) {
      token = s.slice(0, n);
      return tokenFound();
    }
    if ((n = scanDuration(s)) > 0) {
      token = s.slice(0, n);
      return tokenFound();
    }
    if (isPositiveNumberPrefix(s)) {
      token = scanPositiveNumber(s);
      return tokenFound();
    }
    throw new Error(`cannot recognize ${s}`);
  } // _next()
}

function scanString(s: string): string {
  if (s.length < 2) {
    throw new Error(`cannot find end of string in ${s}`);
  }

  const quote = s[0];
  let i = 1;
  while (i < s.length) {
    const n = s.indexOf(quote, i + 1);
    if (n < 0) {
      throw new Error(`cannot find closing quote ${quote} for the string ${s}`);
    }
    i += n;
    let bs = 0;
    while (bs < i && s[i - bs - 1] == '\\') {
      bs++;
    }
    if (bs % 2 == 0) {
      return s.slice(0, i + 1);
    }
    i++;
  }

  return s;
}

function scanPositiveNumber(s: string): string {
  // Scan integer part. It may be empty if fractional part exists.
  let i = 0;
  const [skipChars, isHex] = scanSpecialIntegerPrefix(s);
  i += skipChars;
  if (isHex) {
    // Scan integer hex number
    while (i < s.length && isHexChar(s[i])) {
      i++;
    }
    return s.slice(0, i);
  }
  while (i < s.length && isDecimalChar(s[i])) {
    i++;
  }

  if (i === s.length) {
    if (i === 0) {
      throw new Error('number cannot be empty');
    }
    return s;
  }
  if (s[i] != '.' && s[i] != 'e' && s[i] != 'E') {
    return s.slice(0, i);
  }

  if (s[i] == '.') {
    // Scan fractional part. It cannot be empty.
    i++;
    let j = i;
    while (j < s.length && isDecimalChar(s[j])) {
      j++;
    }
    if (j == i) {
      throw Error(`missing fractional part in ${s}`);
    }
    i = j;
    if (i == s.length) {
      return s;
    }
  }

  if (s[i] != 'e' && s[i] != 'E') {
    return s.slice(0, i);
  }
  i++;

  // Scan exponent part.
  if (i == s.length) {
    throw new Error(`missing exponent part in ${s}`);
  }
  if (s[i] == '-' || s[i] == '+') {
    i++;
  }
  let j = i;
  while (j < s.length && isDecimalChar(s[j])) {
    j++;
  }
  if (j === i) {
    throw new Error(`missing exponent part in ${s}`);
  }
  return s.slice(0, j);
}

function scanIdent(s: string): string {
  let i = 0;
  while (i < s.length) {
    if (isIdentChar(s[i])) {
      i++;
      continue;
    }
    if (s[i] != '\\') {
      break;
    }
    i++;
  }
  if (i == 0) {
    throw new Error(
      // eslint-disable-next-line max-len
      'BUG: scanIdent couldn\'t find a single ident char; make sure isIdentPrefix called before scanIdent',
    );
  }
  return s.slice(0, i);
}

export function unescapeIdent(s: string): string {
  let n = s.indexOf('\\');
  if (n < 0) {
    return s;
  }
  let dst = '';
  while (s.length) {
    dst = dst + s.slice(0, n);
    s = s.slice(n + 1);
    if (s.length === 0) {
      return dst;
    }
    if (s[0] === 'x' && s.length >= 3) {
      const h1 = fromHex(s[1]);
      const h2 = fromHex(s[2]);
      if (h1 >= 0 && h2 >= 0) {
        dst = dst + String.fromCharCode((h1 << 4) | h2);
        s = s.slice(3);
      } else {
        dst = dst + s[0];
        s = s.slice(1);
      }
    } else {
      // UTF8 char. See https://en.wikipedia.org/wiki/UTF-8#Encoding
      dst = dst + s;
    }
    n = s.indexOf('\\');
    if (n < 0) {
      dst = dst + s;
      return dst;
    }
  }

  return dst;
}

const Zero = '0'.charCodeAt(0);
const LowerA = 'a'.charCodeAt(0);
const UpperA = 'A'.charCodeAt(0);

function fromHex(ch: string): number {
  const b = ch.charCodeAt(0);
  if (ch >= '0' && ch <= '9') {
    return b - Zero;
  }
  if (ch >= 'a' && ch <= 'f') {
    return b - LowerA + 10;
  }
  if (ch >= 'A' && ch <= 'F') {
    return b - UpperA + 10;
  }
  return -1;
}

export function toHex(n: number): string {
  if (n < 10) {
    return String.fromCharCode(Zero + n);
  }
  return String.fromCharCode(LowerA + (n - 10));
}

function scanTagFilterOpPrefix(s: string): number {
  if (s.length >= 2) {
    switch (s.slice(0, 2)) {
      case '=~':
      case '!~':
      case '!=':
        return 2;
    }
  }
  if (s.length >= 1) {
    if (s[0] === '=') {
      return 1;
    }
  }
  return -1;
}

export function isEOF(s: string): boolean {
  return s?.length === 0;
}

export function isInfOrNaN(s: string): boolean {
  if (s.length != 3) {
    return false;
  }
  s = s.toLowerCase();
  return s == 'inf' || s == 'nan';
}

export function isOffset(s: string): boolean {
  return s?.toLowerCase() == 'offset';
}

export function isStringPrefix(s: string): boolean {
  if (!s) {
    return false;
  }
  switch (s[0]) {
    // See https://prometheus.io/docs/prometheus/latest/querying/basics/#string-literals
    case '"':
    case '\'':
    case '`':
      return true;
    default:
      return false;
  }
}

export function isPositiveNumberPrefix(s: string): boolean {
  if (s.length == 0) {
    return false;
  }
  if (isDecimalChar(s[0])) {
    return true;
  }

  // Check for .234 numbers
  if (s[0] != '.' || s.length < 2) {
    return false;
  }
  return isDecimalChar(s[1]);
}

export function isSpecialIntegerPrefix(s: string): boolean {
  const [skipChars] = scanSpecialIntegerPrefix(s);
  return skipChars > 0;
}

function scanSpecialIntegerPrefix(s: string): [number, boolean] {
  if (s.length < 1 || s[0] != '0') {
    return [0, false];
  }
  s = s.slice(1).toLowerCase();
  if (s.length === 0) {
    return [0, false];
  }
  if (isDecimalChar(s[0])) {
    // octal number: 0123
    return [1, false];
  }
  if (s[0] === 'x') {
    // 0x
    return [2, true];
  }
  if (s[0] === 'o' || s[0] === 'b') {
    // 0x, 0o or 0b prefix
    return [2, false];
  }
  return [0, false];
}

export function isPositiveDuration(s: string): boolean {
  const n = scanDuration(s);
  return n == s.length;
}

// DurationValue returns the duration in milliseconds for the given s
// and the given step.
//
// Duration in s may be combined, i.e. 2h5m, -2h5m or 2h-5m.
//
// The returned duration value can be negative.
export function parseDurationValue(s: string, step: number): number {
  if (s.length == 0) {
    throw new Error('duration cannot be empty');
  }
  // Try parsing floating-point duration
  let d = parseFloat(s);
  if (!Number.isNaN(d)) {
    // Convert the duration to milliseconds.
    return d * 1000;
  }
  let isMinus = false;
  while (s.length > 0) {
    const n = scanSingleDuration(s, true);
    if (n <= 0) {
      throw new TypeError(`cannot parse duration ${s}`);
    }
    const ds = s.slice(0, n);
    s = s.slice(n);
    let dLocal = parseSingleDuration(ds, step);
    if (isMinus && dLocal > 0) {
      dLocal = -dLocal;
    }
    d += dLocal;
    if (dLocal < 0) {
      isMinus = true;
    }
  }
  if (Math.abs(d) > 1 << 30) {
    throw new RangeError(`too big duration ${d}`);
  }
  return d;
}

function parseSingleDuration(s: string, step: number): number {
  let numPart = s.slice(0, s.length - 1);
  if (numPart.endsWith('m')) {
    // Duration in ms
    numPart = numPart.slice(0, numPart.length - 1);
  }
  const f = parseFloat(numPart);
  if (Number.isNaN(f)) {
    throw new TypeError(`cannot parse duration ${s}`);
  }
  let mp: number;
  const unit = s.slice(numPart.length);
  switch (unit) {
    case 'ms':
      mp = 1e-3;
      break;
    case 's':
      mp = 1;
      break;
    case 'm':
      mp = 60;
      break;
    case 'h':
      mp = 60 * 60;
      break;
    case 'd':
      mp = 24 * 60 * 60;
      break;
    case 'w':
      mp = 7 * 24 * 60 * 60;
      break;
    case 'y':
      mp = 365 * 24 * 60 * 60;
      break;
    case 'i':
      mp = step / 1e3;
      break;
    default:
      throw new Error('invalid duration suffix in ' + s);
  }
  return mp * f * 1e3;
}

// scanDuration scans duration, which must start with positive num.
//
// I.e. 123h, 3h5m or 3.4d-35.66s
function scanDuration(s: string): number {
  // The first part must be non-negative
  let n = scanSingleDuration(s, false);
  if (n <= 0) {
    return -1;
  }
  s = s.slice(n);
  let i = n;
  while (s.length > 0) {
    // Other parts may be negative
    n = scanSingleDuration(s, true);
    if (n <= 0) {
      return i;
    }
    s = s.slice(n);
    i += n;
  }

  return i;
}

export function scanSingleDuration(s: string, canBeNegative: boolean): number {
  if (s.length === 0) {
    return -1;
  }
  let i = 0;
  if (s[0] == '-' && canBeNegative) {
    i++;
  }
  while (i < s.length && isDecimalChar(s[i])) {
    i++;
  }
  if (i == 0 || i == s.length) {
    return -1;
  }
  if (s[i] == '.') {
    const j = i;
    i++;
    while (i < s.length && isDecimalChar(s[i])) {
      i++;
    }
    if (i == j || i == s.length) {
      return -1;
    }
  }
  switch (s[i]) {
    case 'm':
      if (i + 1 < s.length && s[i + 1] == 's') {
        // duration in ms
        return i + 2;
      }
      // duration in minutes
      return i + 1;
    case 's':
    case 'h':
    case 'd':
    case 'w':
    case 'y':
    case 'i':
      return i + 1;
    default:
      return -1;
  }
}

function isDecimalChar(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isHexChar(ch: string): boolean {
  return (
    isDecimalChar(ch) || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F')
  );
}

export function isIdentPrefix(s: string): boolean {
  if (s.length == 0) {
    return false;
  }
  if (s[0] == '\\') {
    // Assume this is an escape char for the next char.
    return true;
  }
  return isFirstIdentChar(s[0]);
}

export function isFirstIdentChar(ch: string): boolean {
  if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
    return true;
  }
  return ch == '_' || ch == ':';
}

export function isIdentChar(ch: string): boolean {
  if (isFirstIdentChar(ch)) {
    return true;
  }
  return isDecimalChar(ch) || ch == '.';
}

function isSpaceChar(ch: string): boolean {
  return [' ', '\t', '\n', '\v', '\f', '\r'].includes(ch);
}

export function skipWhitespace(s: string): string {
  // Skip whitespace
  let i = 0;
  while (i < s.length && isSpaceChar(s[i])) {
    i++;
  }
  s = s.slice(i);
  return s;
}
