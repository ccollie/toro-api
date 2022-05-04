// https://github.com/yunyu/parse-prometheus-text-format

class InvalidFilterError extends Error {
  constructor(message) {
    super('Encountered invalid query: ' + message);
  }
}

Object.defineProperty(InvalidFilterError.prototype, 'name', {
  value: InvalidFilterError.name,
});

const STATE_NAME = 0;
const STATE_STARTOFLABELNAME = 1;
const STATE_ENDOFNAME = 2;
const STATE_VALUE = 3;
const STATE_ENDOFLABELS = 4;
const STATE_LABELNAME = 5;
const STATE_LABELVALUEQUOTE = 6;
const STATE_LABEL_OPERATOR = 7;
const STATE_LABELVALUE = 8;
const STATE_LABELVALUESLASH = 9;
const STATE_NEXTLABEL = 10;
const STATE_TIMESTAMP = 11;
const STATE_FIELDNAME = 12;
const STATE_STARTOFDURATION = 13;


// eslint-disable-next-line max-len
const FloatRegex = /[-+]?([0-9]*\.?[0-9]+([eE][-+]?[0-9]+)? | 0[xX][0-9a-fA-F]+ | [nN][aA][nN] | [iI][nN][fF])/;
export const LabelNameRegex = /[a-zA-Z_][\w]*/;

export interface LabelFilter {
  label: string;
  op: string;
  value: string;
}

export interface ParseResult {
  name: string;
  value: string;
  timeDuration?: number;
  offset?: number;
  instant?: number;
  matches: LabelFilter[];
  fieldName?: string;
  timestampMs?: number;
}

const opChars = '!~=';
const isWhitespace = (char) => (char === ' ' || char === '\t' || char === '\n');
const isOpStart = (char) => opChars.includes(char);
const isOpEnd = (char) => ['~='].includes(char);
const Operators = ['=', '!=', '!~', '=~'];

export default function parseQuery(line: string): ParseResult {
  let name = '';
  let labelName = '';
  let labelValue = '';
  let value = '';
  let timestamp = '';
  let fieldName = '';
  let operator = '';
  let state = STATE_NAME;
  const offset: number | undefined = undefined;
  const instant: number | undefined = undefined;
  const matches: LabelFilter[] = [];


  let c = 0;

  for (; c < line.length; ++c) {
    const char = line.charAt(c);
    if (state === STATE_NAME) {
      if (char === '{') {
        state = STATE_STARTOFLABELNAME;
      } else if (isWhitespace(char)) {
        state = STATE_ENDOFNAME;
      } else {
        name += char;
      }
    } else if (state === STATE_ENDOFNAME) {
      if (isWhitespace(char)) {
        // do nothing
      } else if (char === '{') {
        state = STATE_STARTOFLABELNAME;
      } else {
        value += char;
        state = STATE_VALUE;
      }
    } else if (state === STATE_STARTOFLABELNAME) {
      if (isWhitespace(char)) {
        // do nothing
      } else if (char === '}') {
        state = STATE_ENDOFLABELS;
      } else {
        labelName += char;
        state = STATE_LABELNAME;
      }
    } else if (state === STATE_LABELNAME) {
      if (char === '}') {
        state = STATE_ENDOFLABELS;
      } else if (isWhitespace(char)) {
        state = STATE_LABEL_OPERATOR;
      } else {
        labelName += char;
      }
    } else if (state === STATE_LABEL_OPERATOR) {
      if (isOpStart(char)) {
        operator = char;
        const p = c + 1;
        if (p < line.length && (line[p] !== '=') && isOpEnd(line[p])) {
          operator += line[p];
          if (!Operators.includes(operator)) {
            throw new InvalidFilterError(`Invalid operator "${operator}"`);
          }
          c++;
        }
        state = STATE_LABELVALUEQUOTE;
      } else if (isWhitespace(char)) {
        // do nothing
      } else {
        throw new InvalidFilterError(line);
      }
    } else if (state === STATE_LABELVALUEQUOTE) {
      if (char === '"') {
        state = STATE_LABELVALUE;
      } else if (isWhitespace(char)) {
        // do nothing
      } else {
        throw new InvalidFilterError(line);
      }
    } else if (state === STATE_LABELVALUE) {
      if (char === '\\') {
        state = STATE_LABELVALUESLASH;
      } else if (char === '"') {
        matches.push({
          label: labelName,
          value: labelValue,
          op: operator
        });
        state = STATE_NEXTLABEL;
        labelName = '';
        labelValue = '';
        operator = '';
      } else {
        labelValue += char;
      }
    } else if (state === STATE_LABELVALUESLASH) {
      state = STATE_LABELVALUE;
      if (char === '\\') {
        labelValue += '\\';
      } else if (char === 'n') {
        labelValue += '\n';
      } else if (char === '"') {
        labelValue += '"';
      } else {
        labelValue += `\\${char}`;
      }
    } else if (state === STATE_NEXTLABEL) {
      if (char === ',') {
        state = STATE_LABELNAME;
      } else if (char === '}') {
        state = STATE_ENDOFLABELS;
      } else if (isWhitespace(char)) {
        // do nothing
      } else {
        throw new InvalidFilterError(line);
      }
    } else if (state === STATE_ENDOFLABELS) {
      // parse fieldName
      // metric{name=value}:fieldname
      if (char === ':') {
        state = STATE_FIELDNAME;
      } else if (char === ' ' || char === '\t') {
        // do nothing
      } else if (char === '[') {

      } else {
        value += char;
        state = STATE_VALUE;
      }
    } else if (state === STATE_VALUE) {
      if (isWhitespace(char)) {
        state = STATE_TIMESTAMP;
      } else {
        value += char;
      }
    } else if (state === STATE_TIMESTAMP) {
      if (isWhitespace(char)) {
        // do nothing
      } else {
        timestamp += char;
      }
    } else if (state === STATE_FIELDNAME) {
      if (isWhitespace(char)) {
        state = STATE_VALUE;
      } else {
        fieldName += char;
        if (!LabelNameRegex.test(fieldName)) {
          throw new InvalidFilterError(`Invalid char "${char}" in fieldName`);
        }
      }
    }
  }

  return {
    name,
    value,
    fieldName,
    matches,
    instant,
    timestampMs: timestamp ? parseInt(timestamp) : 0,
  };
}
