import { humanize, titleCase } from '../../utils';
import { chunk, keys as _keys, isObject, isNumber } from 'lodash';
import utils from 'handlebars-utils';
import handlebars from 'handlebars';

/**
 * @description Create a stat section from arbitrary JavaScript objects
 * @param  {Object} inputObj
 * @param  {Number} numColumns number of columns across
 * @returns {Object} fields - a Slack-ready set of "fields"
 */
export default function createDataTable(
  inputObj: Array<any> | Record<string, any>,
  numColumns = 3,
): string {
  if (Array.isArray(inputObj) && inputObj.length === 1) {
    inputObj = inputObj[0];
  }
  const keys = _keys(inputObj).sort();
  if (keys.length === 0) {
    return '';
  }

  const chunkedKeys = chunk(keys, numColumns);

  const rows = chunkedKeys.reduce((res, keys) => {
    const row = keys
      .reduce((res, key) => {
        const value = inputObj[key];
        const item = `<strong>${titleCase(humanize(key))}</strong>\n${value}`;
        res.push(`
      <mj-column>
        <mj-text>
          ${item}
        </mj-text>
      </mj-column>
      `);
        return res;
      }, [])
      .join('\n');

    const wrapped = `<mj-section background-color="#fff">${row}</mj-section>`;
    res.push(wrapped);

    return res;
  }, []);

  return rows.join('\n');
}

function propTableHelper(obj, options) {
  if (utils.isOptions(obj) || !isObject(obj)) {
    throw new TypeError('expected an object');
  }
  const columns = options?.hash?.columns ?? 3;
  if (!isNumber(columns)) {
    throw new TypeError('number expected for "columns"');
  }
  const table = createDataTable(obj, columns);
  return new handlebars.SafeString(table);
}

export const handlebarsHelpers = {
  propTable: propTableHelper,
};
