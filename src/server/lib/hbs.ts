import handlebars from 'handlebars';
import handlebarsHelpers from 'handlebars-helpers';
import ms from 'ms';
import prettyMilliseconds from 'pretty-ms';
import { isNumber, markdownToHtml } from './index';
import {
  capitalize,
  isEmpty,
  isString,
  isRegExp,
  lowerCase,
  get,
} from 'lodash';
import formatDate from 'date-fns/format';
import toDate from 'date-fns/toDate';
import utils from 'handlebars-utils';

const helpers = handlebarsHelpers(['math', 'comparison', 'number'], {
  handlebars,
});

// Markdown block helper
function markdown(str, options) {
  if (utils.isOptions(str)) {
    options = str;
    str = options.fn(this);
  }

  if (typeof str !== 'string') {
    return ''; // todo: throw
  }

  const trim = !!options?.hash?.trim;
  if (trim) {
    str = str.trim();
  }
  return markdownToHtml(str);
}

/**
 * Returns true if the given `str` matches the given regex. A regex can
 * be passed on the context, or using the [toRegex](#toregex) helper as a
 * subexpression.
 *
 * ```handlebars
 * {{regexMatch "bar" "foo"}}
 * <!-- results in: false -->
 * {{test "foobar" "foo"}}
 * <!-- results in: true -->
 * {{test "foobar" "^foo$"}}
 * <!-- results in: false -->
 * ```
 * @param {String} `str`
 * @return {RegExp}
 * @api public
 */

function regexMatch(str, regex, options): boolean {
  if (!isString(str)) {
    throw new TypeError('expected a string');
  }
  if (isString(regex)) {
    regex = new RegExp(regex);
  }
  if (!isRegExp(regex)) {
    throw new TypeError('expected a regular expression');
  }

  return utils.value(regex.test(str), this, options);
}

/**
 * Use property paths (`a.b.c`) to get a value or nested value from
 * the context. Works as a regular helper or block helper.
 *
 * @param {String} `prop` The property to get, optionally using dot notation for nested properties.
 * @param {Object} `context` The context object
 * @param {Object} `options` The handlebars options object, if used as a block helper.
 * @return {String}
 * @block
 * @api public
 */
function getProperty(prop, context, options) {
  if (utils.isOptions(context)) {
    options = context;
    context = options.data.root;
  }
  const val = get(context, prop);
  if (options && options.fn) {
    return val ? options.fn(val) : options.inverse(context);
  }
  return val;
}

const extras = {
  capitalize,
  isEmpty,
  lowercase: lowerCase,
  ms: (val, opts = { long: false }, options) => {
    const defaults = { long: false };
    return ms(val, opts);
  },
  regexMatch,
  prettyMs: (ts, options = {}) => {
    if (!isNumber(ts)) {
      throw new TypeError(
        'Expected a timestamp expressed in milliseconds (integer)',
      );
    }
    return prettyMilliseconds(parseInt(ts), options);
  },
  date: (timestamp) => {
    return toDate(timestamp).toString();
  },
  formatDate: (date, formatString) => {
    formatString = formatString || 'yyyy-MM-dd h:mm:ss bb';
    return formatDate(date, formatString);
  },
};

let isInit = false;

export function registerHelpers(): void {
  if (isInit) return;
  isInit = true;

  handlebars.registerHelper('markdown', markdown);
  handlebars.registerHelper('get', getProperty);

  for (const [name, fn] of Object.entries(helpers)) {
    handlebars.registerHelper(name, fn);
  }
  for (const [name, fn] of Object.entries(extras)) {
    handlebars.registerHelper(name, fn);
  }
}
