// https://github.com/yunyu/parse-prometheus-text-format

class InvalidLineError extends Error {
  constructor(message) {
    super('Encountered invalid line: ' + message);
  }
}

Object.defineProperty(InvalidLineError.prototype, 'name', {
  value: InvalidLineError.name,
});

const STATE_NAME = 0;
const STATE_STARTOFLABELNAME = 1;
const STATE_ENDOFNAME = 2;
const STATE_VALUE = 3;
const STATE_ENDOFLABELS = 4;
const STATE_LABELNAME = 5;
const STATE_LABELVALUEQUOTE = 6;
const STATE_LABELVALUEEQUALS = 7;
const STATE_LABELVALUE = 8;
const STATE_LABELVALUESLASH = 9;
const STATE_NEXTLABEL = 10;
const STATE_TIMESTAMP = 11;

export interface ParseResult {
  name: string;
  value: string;
  labels: Record<string, string>;
  timestampMs?: number;
}

export function parseMetricName(canonical: string): {
  name: string;
  tags: Map<string, string>;
} {
  const tags = new Map<string, string>();
  const parsed = parseSampleLine(canonical);
  Object.values(parsed.labels).forEach(k => {
    tags.set(k, parsed.labels[k]);
  });
  return {
    name: parsed.name,
    tags
  };
}

export default function parseSampleLine(line: string): ParseResult {
  let name = '';
  let labelname = '';
  let labelvalue = '';
  let value = '';
  let timestamp = '';
  let labels = undefined;
  let state = STATE_NAME;

  for (let c = 0; c < line.length; ++c) {
    const char = line.charAt(c);
    if (state === STATE_NAME) {
      if (char === '{') {
        state = STATE_STARTOFLABELNAME;
      } else if (char === ' ' || char === '\t') {
        state = STATE_ENDOFNAME;
      } else {
        name += char;
      }
    } else if (state === STATE_ENDOFNAME) {
      if (char === ' ' || char === '\t') {
        // do nothing
      } else if (char === '{') {
        state = STATE_STARTOFLABELNAME;
      } else {
        value += char;
        state = STATE_VALUE;
      }
    } else if (state === STATE_STARTOFLABELNAME) {
      if (char === ' ' || char === '\t') {
        // do nothing
      } else if (char === '}') {
        state = STATE_ENDOFLABELS;
      } else {
        labelname += char;
        state = STATE_LABELNAME;
      }
    } else if (state === STATE_LABELNAME) {
      if (char === '=') {
        state = STATE_LABELVALUEQUOTE;
      } else if (char === '}') {
        state = STATE_ENDOFLABELS;
      } else if (char === ' ' || char === '\t') {
        state = STATE_LABELVALUEEQUALS;
      } else {
        labelname += char;
      }
    } else if (state === STATE_LABELVALUEEQUALS) {
      if (char === '=') {
        state = STATE_LABELVALUEQUOTE;
      } else if (char === ' ' || char === '\t') {
        // do nothing
      } else {
        throw new InvalidLineError(line);
      }
    } else if (state === STATE_LABELVALUEQUOTE) {
      if (char === '"') {
        state = STATE_LABELVALUE;
      } else if (char === ' ' || char === '\t') {
        // do nothing
      } else {
        throw new InvalidLineError(line);
      }
    } else if (state === STATE_LABELVALUE) {
      if (char === '\\') {
        state = STATE_LABELVALUESLASH;
      } else if (char === '"') {
        if (!labels) {
          labels = {};
        }
        labels[labelname] = labelvalue;
        labelname = '';
        labelvalue = '';
        state = STATE_NEXTLABEL;
      } else {
        labelvalue += char;
      }
    } else if (state === STATE_LABELVALUESLASH) {
      state = STATE_LABELVALUE;
      if (char === '\\') {
        labelvalue += '\\';
      } else if (char === 'n') {
        labelvalue += '\n';
      } else if (char === '"') {
        labelvalue += '"';
      } else {
        labelvalue += `\\${char}`;
      }
    } else if (state === STATE_NEXTLABEL) {
      if (char === ',') {
        state = STATE_LABELNAME;
      } else if (char === '}') {
        state = STATE_ENDOFLABELS;
      } else if (char === ' ' || char === '\t') {
        // do nothing
      } else {
        throw new InvalidLineError(line);
      }
    } else if (state === STATE_ENDOFLABELS) {
      if (char === ' ' || char === '\t') {
        // do nothing
      } else {
        value += char;
        state = STATE_VALUE;
      }
    } else if (state === STATE_VALUE) {
      if (char === ' ' || char === '\t') {
        state = STATE_TIMESTAMP;
      } else {
        value += char;
      }
    } else if (state === STATE_TIMESTAMP) {
      if (char === ' ' || char === '\t') {
        // do nothing
      } else {
        timestamp += char;
      }
    }
  }

  return {
    name,
    value,
    labels: labels ?? {},
    timestampMs: timestamp ? parseInt(timestamp) : 0,
  };
}
