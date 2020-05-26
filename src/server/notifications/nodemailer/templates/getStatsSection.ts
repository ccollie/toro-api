import { titleCase } from '../../../lib/utils';
import { humanize } from '../../utils';
import { chunk } from 'lodash';

/**
 * @description Create a stat section from arbitrary JavaScript objects
 * @param  {Object} inputObj
 * @param  {Number} numColumns number of columns across
 * @param  {String} title header for the section
 * @returns {Object} fields - a Slack-ready set of "fields"
 */
export default function getStatsSection(
  inputObj,
  numColumns = 3,
  title = 'Data',
): string {
  if (Array.isArray(inputObj) && inputObj.length === 1) {
    inputObj = inputObj[0];
  }
  const keys = Object.keys(inputObj).sort();
  if (keys.length === 0) {
    return '';
  }

  const chunkedKeys = chunk(keys, numColumns);

  const cols = chunkedKeys.reduce((res, keys) => {
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

    res.push(row);

    return res;
  }, []);

  return `
    <mj-section background-color="#fff">
      <mj-text>
        <h3>${title}</h3>
      </mj-text>
      <mj-divider border-width="1px" border-color="#f5f5f5">
      </mj-divider>
      ${cols.join('\n')}
    </mj-section>`;
}
