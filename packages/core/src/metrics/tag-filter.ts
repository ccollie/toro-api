import { MetricName } from './metric-name';
import LRUCache from 'lru-cache';
import { optimizeConcatRegex } from './regex';

// The prefix for composite tag, which is used for speeding up searching
// for composite filters, which contain `{__name__="<metric_name>"}` filter.
//
// It is expected that the given prefix isn't used by users.
export const compositeTagKeyPrefix = '\xfe';
export const tagSeparatorChar = 1;
// Prefix for Tag->MetricID entries.
export const nsPrefixTagToMetricIDs = 1;

type MatchFn = (tag: string) => boolean;

// Possible MatchTypes.
export enum MatchType {
  MatchEqual,
  MatchNotEqual,
  MatchRegexp,
  MatchNotRegexp,
}

const MatchTypeNameMap: Record<MatchType, string> = {
  [MatchType.MatchEqual]: '=',
  [MatchType.MatchNotEqual]: '!=',
  [MatchType.MatchRegexp]: '=~',
  [MatchType.MatchNotRegexp]: '!~',
};

// convertToCompositeTagFilterss converts tfss to composite filters.
//
// This converts `foo{bar="baz",x=~"a.+"}` to `{foo=bar="baz",foo=x=~"a.+"} filter.
export function convertToCompositeTagFilterss(
  tfss: TagFilterList[],
): TagFilterList[] {
  const tfssNew = [];
  tfss.forEach((tfs) => {
    tfssNew.push(...convertToCompositeTagFilters(tfs));
  });
  return tfssNew;
}

function convertToCompositeTagFilters(tfs: TagFilterList): TagFilterList[] {
  const tfssCompiled: TagFilterList[] = [];
  // Search for filters on metric name, which will be used for creating composite filters.
  let names: string[] = [];
  let namePrefix = '';
  let hasPositiveFilter = false;
  tfs.tfs.forEach((tf) => {
    if (tf.key.length === 0) {
      if (!tf.isNegative && !tf.isRegexp) {
        names = [tf.value];
      } else if (!tf.isNegative && tf.isRegexp && tf.orSuffixes.length > 0) {
        // Split the filter {__name__=~"name1|...|nameN", other_filters}
        // into name1{other_filters}, ..., nameN{other_filters}
        // and generate composite filters for each of them.
        names = [...tf.orSuffixes]; // override the previous filters on metric name
        namePrefix = tf.regexpPrefix;
      }
    } else if (!tf.isNegative && !tf.isEmptyMatch) {
      hasPositiveFilter = true;
    }
  });
  if (names.length === 0) {
    return [tfs];
  }

  // Create composite filters for the found names.
  let compositeKey, nameWithPrefix: string;
  for (let k = 0; k < names.length; k++) {
    const name = names[k];
    let compositeFilters = 0;

    const tfsNew = [];
    const items = tfs.tfs;
    for (let i = 0; i < items.length; i++) {
      const tf = items[i];
      if (tf.key.length === 0) {
        if (!hasPositiveFilter || tf.isNegative) {
          // Negative filters on metric name cannot be used for building composite filter, so leave
          // them as is.
          tfsNew.push(tf);
          continue;
        }
        if (tf.isRegexp) {
          const matchName = tf.orSuffixes.includes(name);
          if (!matchName) {
            // Leave as is the regexp filter on metric name if it doesn't match the current name.
            tfsNew.push(tf);
            continue;
          }
          // Skip the tf, since its part (name) is used as a prefix in composite filter.
          continue;
        }
        if (tf.value !== name) {
          // Leave as is the filter on another metric name.
          tfsNew.push(tf);
          continue;
        }
        // Skip the tf, since it is used as a prefix in composite filter.
        continue;
      }
      // Create composite filter on (name, tf)
      nameWithPrefix = namePrefix + name;
      compositeKey = marshalCompositeTagKey(nameWithPrefix, tf.key);
      try {
        const tfNew = new TagFilter(
          tfs.commonPrefix,
          compositeKey,
          tf.value,
          tf.isNegative,
          tf.isRegexp,
        );
        tfsNew.push(tfNew);
      } catch (err) {
        throw new Error(
          // eslint-disable-next-line max-len
          `BUG: unexpected error when creating composite tag filter for name=${name} and key=${tf.key}: ${err}`,
        );
      }

      compositeFilters++;
    }

    if (compositeFilters === 0) {
      // Cannot use tfsNew, since it doesn't contain composite filters, e.g. it may match broader
      // set of series.
      // Fall back to the original tfs.
      return [tfs];
    }
    const tfsCompiled = new TagFilterList();
    tfsCompiled.tfs = tfsNew;
    tfssCompiled.push(tfsCompiled);
  }
  return tfssCompiled;
}

// tagFilter represents a filter used for filtering tags.
export class TagFilter {
  key: string;
  value: string;
  isNegative: boolean;
  isRegexp: boolean;

  // matchCost is a cost for matching a filter against a single string.
  matchCost: number;

  // contains the prefix for regexp filter if isRegexp==true.
  regexpPrefix: string;

  // Prefix contains either {nsPrefixTagToMetricIDs, key} or
  // {nsPrefixDateTagToMetricIDs, date, key}.
  // Additionally it contains:
  //  - value if !isRegexp.
  //  - regexpPrefix if isRegexp.
  prefix: string;

  // `or` values obtained from regexp suffix if it equals to "foo|bar|..."
  //
  // the regexp prefix is stored in regexpPrefix.
  //
  // This array is also populated with matching Graphite metrics if key="__graphite__"
  orSuffixes: string[];

  // Matches regexp suffix.
  reSuffixMatch: (b: string) => boolean;

  // Set to true for filters matching empty value.
  isEmptyMatch: boolean;

  get isComposite(): boolean {
    const k = this.key;
    return k.length > 0 && k[0] == compositeTagKeyPrefix;
  }

  compare(other: TagFilter): number {
    // Move composite filters to the top, since they usually match lower number of time series.
    // Move regexp filters to the bottom, since they require scanning all the entries for the given
    // label.
    const isCompositeA = this.isComposite;
    const isCompositeB = this.isComposite;
    if (isCompositeA != isCompositeB) {
      return (isCompositeA ? 1 : 0) - (isCompositeB ? 1 : 0);
    }
    if (this.matchCost != other.matchCost) {
      return this.matchCost - other.matchCost;
    }
    if (this.isRegexp != other.isRegexp) {
      return (this.isRegexp ? 1 : 0) - (other.isRegexp ? 1 : 0);
    }
    if (this.orSuffixes.length !== other.orSuffixes.length) {
      return this.orSuffixes.length - other.orSuffixes.length;
    }
    if (this.isNegative != other.isNegative) {
      return (this.isNegative ? 1 : 0) - (other.isNegative ? 1 : 0);
    }
    return this.prefix.localeCompare(other.prefix);
  }

  // Init initializes the tag filter for the given commonPrefix, key and value.
  //
  // commonPrefix must contain either {nsPrefixTagToMetricIDs} or
  // {nsPrefixDateTagToMetricIDs, date}.
  //
  // If isNegative is true, then the tag filter matches all the values
  // except the given one.
  //
  // If isRegexp is true, then the value is interpreted as anchored regexp,
  // i.e. '^(tag.Value)$'.
  //
  // MetricGroup must be encoded in the value with null key.
  constructor(
    commonPrefix: string,
    key: string,
    value: string,
    isNegative: boolean,
    isRegexp: boolean,
  ) {
    this.key = key;
    this.value = value;
    this.isNegative = isNegative;
    this.isRegexp = isRegexp;
    this.matchCost = 0;

    this.regexpPrefix = '';
    this.prefix = '';

    this.orSuffixes = this.orSuffixes.slice(0);
    this.reSuffixMatch = null;
    this.isEmptyMatch = false;

    this.prefix = commonPrefix;
    this.prefix = key;

    let expr: string;
    const prefix = this.value;
    if (this.isRegexp) {
      const [prefix, expr] = getRegexpPrefix(this.value);
      if (expr.length === 0) {
        this.value = prefix;
        this.isRegexp = false;
      } else {
        this.regexpPrefix = prefix;
      }
    }
    if (
      prefix.length > 0 &&
      prefix.charCodeAt(prefix.length - 1) === tagSeparatorChar
    ) {
      this.prefix = prefix.slice(0, prefix.length - 1);
    }
    if (!this.isRegexp) {
      // this contains plain value without regexp.
      // Add empty orSuffix in order to trigger fast path for orSuffixes
      // during the search for matching metricIDs.
      this.orSuffixes = [''];
      this.isEmptyMatch = prefix.length === 0;
      this.matchCost = fullMatchCost;
      return;
    }
    const rcv = getRegexpFromCache(expr);
    this.orSuffixes = [...rcv.orValues];
    this.reSuffixMatch = rcv.reMatch;
    this.matchCost = rcv.reCost;
    this.isEmptyMatch = prefix.length === 0 && this.reSuffixMatch(null);
    return;
  }

  clone(): TagFilter {
    const res = new TagFilter(
      this.prefix,
      this.key,
      this.value,
      this.isNegative,
      this.isRegexp,
    );
    res.orSuffixes = this.orSuffixes.slice(0);
    res.reSuffixMatch = this.reSuffixMatch;
    res.isEmptyMatch = this.isEmptyMatch;
    res.matchCost = this.matchCost;
    res.regexpPrefix = this.regexpPrefix;
    return res;
  }

  match(b: string): boolean {
    const prefix = this.prefix;
    if (!b.startsWith(prefix)) {
      return this.isNegative;
    }
    try {
      const ok = this.matchSuffix(b.slice(prefix.length));
      if (!ok) {
        return this.isNegative;
      }
      return !this.isNegative;
    } catch {
      return false;
    }
  }

  matchSuffix(b: string): boolean {
    // Remove the trailing tagSeparatorChar.
    if (b.length === 0 || b.charCodeAt(b.length - 1) !== tagSeparatorChar) {
      throw new Error(`unexpected end of b; want ${tagSeparatorChar}; b=${b}`);
    }
    b = b.slice(0, b.length - 1);
    if (!this.isRegexp) {
      return b.length == 0;
    }
    return this.reSuffixMatch(b);
  }

  toString(): string {
    let op = '=';
    if (this.isNegative) {
      op = '!=';
      if (this.isRegexp) {
        op = '!~';
      }
    } else if (this.isRegexp) {
      op = '=~';
    }
    let key = this.key;
    if (key.length === 0) {
      key = '__name__';
    }
    return `${key}${op}${this.value}`;
  }
}

// TagFilters represents filters used for filtering tags.
export class TagFilterList {
  tfs: TagFilter[] = [];

  // Common prefix for all the tag filters.
  // Contains encoded nsPrefixTagToMetricIDs.
  commonPrefix: string;

  constructor(commonPrefix?: string, tfs: TagFilter[] = []) {
    this.commonPrefix =
      commonPrefix || String.fromCharCode(nsPrefixTagToMetricIDs);
    this.tfs = tfs;
  }

  // Add adds the given tag filter to tfs.
  //
  // MetricGroup must be encoded with null key.
  add(key: string, value: string, isNegative: boolean, isRegexp: boolean) {
    // Verify whether tag filter is empty.
    if (value.length === 0) {
      // Substitute an empty tag value with the negative match
      // of `.+` regexp in order to filter out all the values with
      // the given tag.
      isNegative = !isNegative;
      isRegexp = true;
      value = '.+';
    }
    if (isRegexp && value === '.*') {
      if (!isNegative) {
        // Skip tag filter matching anything, since it equals to no filter.
        return;
      }

      // Substitute negative tag filter matching anything with negative tag filter matching
      // non-empty value in order to filter out all the time series with the given key.
      value = '.+';
    }

    let tf: TagFilter;
    try {
      tf = new TagFilter(this.commonPrefix, key, value, isNegative, isRegexp);
      this.tfs.push(tf);
    } catch (e) {
      throw new Error(`cannot initialize tagFilter: ${e}`);
    }
    if (tf.isNegative && tf.isEmptyMatch) {
      // We have {key!~"|foo"} tag filter, which matches non=empty key values.
      // So add {key=~".+"} tag filter in order to enforce this.
      // See https://github.com/VictoriaMetrics/VictoriaMetrics/issues/546 for details.
      try {
        const tfNew = new TagFilter(this.commonPrefix, key, '.+', false, true);
        this.tfs.push(tfNew);
      } catch (e) {
        throw new Error(`cannot initialize {${key}=".+"} tag filter: ${e}`);
      }
    }
    return;
  }

  // String returns human-readable value for tfs.
  toString(): string {
    const tfs = this.tfs;
    if (tfs?.length === 0) {
      return '{}';
    }
    let dst = '{' + tfs[0].toString();
    for (let i = 1; i < tfs.length; i++) {
      // i = 1
      dst += ',' + tfs[i].toString();
    }
    dst += '}';
    return dst;
  }

  reset() {
    this.tfs = [];
    this.commonPrefix = String.fromCharCode(nsPrefixTagToMetricIDs);
  }
}

export function matchTagFilters(mn: MetricName, tfs: TagFilter[]): boolean {
  for (let i = 0; i < tfs.length; i++) {
    const tf = tfs[i];
    // Search for matching tag name.
    let tagMatched = false;
    let tagSeen = false;

    for (const [key, value] of mn.tags) {
      if (key !== tf.key) {
        continue;
      }

      // Found the matching tag name. Match the value.
      tagSeen = true;
      const b = key + value;
      const ok = tf.match(b);
      if (!ok) {
        // Move failed tf to start.
        // This should reduce the amount of useless work for the next mn.
        if (i > 0) {
          const temp = tfs[0];
          tfs[0] = tfs[i];
          tfs[i] = temp;
        }
        return false;
      }
      tagMatched = true;
      break;
    }
    if (!tagSeen && tf.isNegative && !tf.isEmptyMatch) {
      // tf contains negative filter for non-existing tag key
      // and this filter doesn't match empty string, i.e. {non_existing_tag_key!="foobar"}
      // Such filter matches anything.
      //
      // Note that the filter `{non_existing_tag_key!~"|foobar"}` shouldn't match anything,
      // since it is expected that it matches non-empty `non_existing_tag_key`.
      // See https://github.com/VictoriaMetrics/VictoriaMetrics/issues/546 for details.
      continue;
    }
    if (tagMatched) {
      // tf matches mn. Go to the next tf.
      continue;
    }
    // Matching tag name wasn't found.
    // Move failed tf to start.
    // This should reduce the amount of useless work for the next mn.
    if (i > 0) {
      const temp = tfs[0];
      tfs[0] = tfs[i];
      tfs[i] = temp;
    }
    return false;
  }
  return true;
}

type RegexpCacheValue = {
  orValues: string[];
  reMatch: (b: string) => boolean;
  reCost: number;
  literalSuffix: string;
};

const regexpCache = new LRUCache<string, RegexpCacheValue>({
  ttl: 15000,
  maxSize: 50,
});

function getRegexpFromCache(expr: string): RegexpCacheValue {
  const rcv = regexpCache.get(expr);
  if (rcv) {
    // Fast path - the regexp found in the cache.
    return rcv;
  }

  // Slow path - build the regexp.
  const exprOrig = expr;

  expr = escapeChars(exprOrig, tagCharsRegexpReplacements);
  const sExpr = expr;
  const orValues = getOrValues(sExpr);
  let reMatch: MatchFn;
  let reCost: number;
  let literalSuffix: string;
  if (orValues.length > 0) {
    [reMatch, reCost] = newMatchFuncForOrSuffixes(orValues);
  } else {
    const exprStr = `^(${expr}})$`;
    const re = new RegExp(exprStr);
    const fn = (s: string) => re.test(s);
    [reMatch, literalSuffix, reCost] = getOptimizedReMatchFunc(fn, sExpr);
  }

  // Put the reMatch in the cache.
  rcv.orValues = orValues;
  rcv.reMatch = reMatch;
  rcv.reCost = reCost;
  rcv.literalSuffix = literalSuffix;

  regexpCache.set(exprOrig, rcv);

  return rcv;
}

function newMatchFuncForOrSuffixes(orValues: string[]): [MatchFn, number] {
  let reMatch: MatchFn;
  if (orValues.length === 1) {
    const v = orValues[0];
    reMatch = (b: string): boolean => b == v;
  } else {
    reMatch = (b: string): boolean => orValues.indexOf(b) >= 0;
  }
  const reCost = orValues.length * literalMatchCost;
  return [reMatch, reCost];
}

const LiteralRegexpString = '[a-zA-Z_][a-zA-Z0-9_]*';
const OrValuesRegex = /^\w+(\|\w+)*$/;

// These cost values are used for sorting tag filters in ascending order or the required CPU time
// for execution.
//
// These values are obtained from BenchmarkOptimizedReMatchCost benchmark.
const fullMatchCost = 1;
const prefixMatchCost = 2;
const literalMatchCost = 3;
const suffixMatchCost = 4;
const middleMatchCost = 6;
const reMatchCost = 100;

type RegexMatchSpec = {
  re: RegExp | string;
  handler: (literal?: string) => [MatchFn, string, number];
};

const matchSpecs: Array<RegexMatchSpec> = [
  {
    re: '.*',
    handler: () => [(_: string): boolean => true, '', fullMatchCost],
  },
  {
    re: '.+',
    handler: () => [(b: string): boolean => b.length > 0, '', fullMatchCost],
  },
  {
    re: new RegExp(`^(${LiteralRegexpString})$`),
    handler: (literal: string) => [
      (b: string): boolean => b == literal,
      literal,
      literalMatchCost,
    ],
  },
  {
    re: new RegExp(`^(${LiteralRegexpString}).*$`),
    handler: (prefix: string) => {
      // 'prefix.*'
      return [
        (b: string): boolean => b.startsWith(prefix),
        '',
        prefixMatchCost,
      ];
    },
  },
  {
    re: new RegExp(`^(${LiteralRegexpString}).+$`),
    handler: (prefix: string) => {
      // 'prefix.+'
      return [
        (b: string): boolean =>
          b.length > prefix.length && b.startsWith(prefix),
        '',
        prefixMatchCost,
      ];
    },
  },
  {
    re: new RegExp(`^.*(${LiteralRegexpString})$`),
    handler: (suffix: string) => {
      // '.*suffix'
      return [
        (b: string): boolean => b.endsWith(suffix),
        suffix,
        suffixMatchCost,
      ];
    },
  },
  {
    re: new RegExp(`^.+(${LiteralRegexpString})$`),
    handler: (suffix: string) => {
      // '.+suffix'
      return [
        (b: string) => b.length > suffix.length && b.slice(1).endsWith(suffix),
        suffix,
        suffixMatchCost,
      ];
    },
  },
  {
    re: new RegExp(`^.*(${LiteralRegexpString}).*$`),
    handler: (middle: string) => {
      // '.*middle.*'
      return [(b: string) => b.includes(middle), '', middleMatchCost];
    },
  },
  {
    re: new RegExp(`^.*(${LiteralRegexpString}).+$`),
    handler: (middle: string) => {
      // '.*middle.+'
      return [
        (b: string): boolean => {
          return b.length > middle.length && b.includes(middle);
        },
        '',
        middleMatchCost,
      ];
    },
  },
  {
    re: new RegExp(`^.+(${LiteralRegexpString}).*$`),
    handler: (middle: string) => {
      // '.+middle.*'
      return [
        (b: string): boolean =>
          b.length > middle.length && b.slice(1).includes(middle),
        '',
        middleMatchCost,
      ];
    },
  },
  {
    re: new RegExp(`^.+(${LiteralRegexpString}).+$`),
    handler: (middle: string) => {
      // '.+middle.+'
      return [
        (b: string): boolean => {
          const sub = b.slice(1);
          return b.length > middle.length + 1 && sub.includes(middle);
        },
        '',
        middleMatchCost,
      ];
    },
  },
  {
    re: OrValuesRegex,
    handler: (orValues: string) => {
      // 'a|b|c'
      const orValuesArray = orValues.split('|');
      const [matchFn, cost] = newMatchFuncForOrSuffixes(orValuesArray);
      return [matchFn, orValues, cost];
    },
  },
];

// getOptimizedReMatchFunction tries returning optimized function for matching the given expr.
//   '.*'
//   '.+'
//   'literal.*'
//   'literal.+'
//   '.*literal'
//   '.+literal
//   '.*literal.*'
//   '.*literal.+'
//   '.+literal.*'
//   '.+literal.+'
//
// It returns reMatch if it cannot find optimized function.
//
// It also returns literal suffix from the expr.
function getOptimizedReMatchFunc(
  reMatch: MatchFn,
  expr: string,
): [MatchFn, string, number] {
  let matchFunc: MatchFn;
  let literalSuffix: string;
  let reCost: number;

  for (let i = 0; i < matchSpecs.length; i++) {
    const spec = matchSpecs[i];
    if (typeof spec.re === 'string') {
      if (spec.re === expr) {
        [matchFunc, literalSuffix, reCost] = spec.handler('');
      }
    } else {
      const res = spec.re.exec(expr);
      if (res && res.length) {
        [matchFunc, literalSuffix, reCost] = spec.handler(res[1]);
      }
    }
  }

  if (matchFunc) {
    // Found optimized function for matching the expr.
    const suffixUnescaped = escapeChars(
      literalSuffix,
      tagCharsReverseRegexpReplacements,
    );
    return [matchFunc, suffixUnescaped, reCost];
  }
  // Fall back to un-optimized reMatch.
  return [reMatch, '', reMatchCost];
}

const maxOrValues = 20;

function getOrValues(expr: string): string[] {
  if (OrValuesRegex.test(expr)) {
    const orValues = expr.split('|').sort();
    return orValues;
  }
  return [];
}

const tagCharsRegexpReplacements: Record<string, string> = {
  '\\x00': '\\x000', // escapeChar
  '\x00': '\\x000', // escapeChar
  '\\x01': '\\x001', // tagSeparatorChar
  '\x01': '\\x001', // tagSeparatorChar
  '\\x02': '\\x002', // kvSeparatorChar
  '\x02': '\\x002', // kvSeparatorChar
};

const tagCharsReverseRegexpReplacements: Record<string, string> = {
  '\\x000': '\x00', // escapeChar
  '\x000': '\x00', // escapeChar
  '\\x001': '\x01', // tagSeparatorChar
  '\x001': '\x01', // tagSeparatorChar
  '\\x002': '\x02', // kvSeparatorChar
  '\x002': '\x02', // kvSeparatorChar
};

function escapeChars(
  str: string,
  replacements: Record<string, string>,
): string {
  return str.replace(/[\x00-\x02]/g, (match) => replacements[match]);
}

function getRegexpPrefix(b: string): [string, string] {
  // Fast path - search the prefix in the cache.
  const ps = prefixesCacheMap.get(b);

  if (ps) {
    return [ps.prefix, ps.suffix];
  }

  // Slow path - extract the regexp prefix from b.
  const re = new RegExp(b);
  const { prefix, suffix } = optimizeConcatRegex(re);

  prefixesCacheMap.set(b, { prefix, suffix });

  return [prefix, suffix];
}

type PrefixSuffix = {
  prefix: string;
  suffix: string;
};

const prefixesCacheMap = new LRUCache<string, PrefixSuffix>({
  ttl: 10000,
  maxSize: 50,
});

export function marshalCompositeTagKey(name: string, key: string): string {
  return `${compositeTagKeyPrefix}${name}${key}`;
}
