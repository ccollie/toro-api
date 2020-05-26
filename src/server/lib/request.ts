import boom from '@hapi/boom';
import got from 'got';
import { isEmpty, isObject } from 'lodash';
import { packageInfo } from '../packageInfo';

const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
    'user-agent': `${packageInfo.name}/${packageInfo.version} (${packageInfo.homepage})`,
  },
};

export default async function request(url, options) {
  if (isEmpty(url)) {
    // todo: validate url
    throw boom.badRequest('url missing or invalid', { url });
  }

  const overrides = {};

  if (isObject(options.body)) {
    overrides['body'] = JSON.stringify(options.body);
  }
  const mergedOptions = Object.assign({}, defaultOptions, options, overrides);

  return got(url, mergedOptions);
}
