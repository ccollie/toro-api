import handlebars from 'handlebars';
import ms from 'ms';
import prettyMilliseconds from 'pretty-ms';
import { getQueueUrl } from '../../../lib/urlService';
import { isNumber, abbreviateNumber } from '../../../lib/utils';
import { toFixed, escapeURI, urlEncode } from '../../utils';
import { systemClock } from '../../../lib/clock';
import { isEmpty } from 'lodash';
import getStatsSection from './getStatsSection';
import formatDate from 'date-fns/format';

const helpers = {
  ceil: (num) => {
    if (!isNumber(num)) {
      throw new TypeError('expected a number');
    }
    return Math.ceil(num);
  },
  floor: (num) => {
    if (!isNumber(num)) {
      throw new TypeError('expected a number');
    }
    return Math.floor(num);
  },
  isEmpty: (value) => isEmpty(value),
  toFixed,
  escapeURI,
  urlEncode,
  abbreviateNumber,
  queueUrl: (queue, options) => {
    return getQueueUrl(queue, options);
  },
  ms: (val, options = {}) => {
    return ms(val, options);
  },
  prettyMs: (ts, options = {}) => {
    if (!isNumber(ts)) {
      throw new TypeError(
        'Expected a timestamp expressed in milliseconds (integer)',
      );
    }
    return prettyMilliseconds(parseInt(ts), options);
  },
  statsSection: getStatsSection,
  objTable: getStatsSection,
  date: (timestamp) => {
    return new Date(timestamp).toString();
  },
  formatDate: (date, formatString) => {
    formatString = formatString || 'yyyy-MM-dd h:mm:ss bb';
    return formatDate(date, formatString);
  },
  duration: (timestamp) => {
    return prettyMilliseconds(systemClock.now() - timestamp);
  },
};

handlebars.registerHelper('link', function (text, options) {
  const attrs = [];
  for (const prop in options.hash) {
    attrs.push(prop + '="' + options.hash[prop] + '"');
  }
  return new handlebars.SafeString(`<a ${attrs.join(' ')}>${text}</a>`);
});

handlebars.registerHelper('queue-link', function (queue, options) {
  const url = getQueueUrl(queue, options);
  return new handlebars.SafeString(`<a href="${url}">${queue.name}</a>`);
});

export function registerHelpers() {
  for (const [name, fn] of Object.entries(helpers)) {
    handlebars.registerHelper(name, fn);
  }
}
