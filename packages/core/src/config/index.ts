import dotenv from 'dotenv';
import nconf from 'nconf';
import path from 'path';
import fs from 'fs';
import { packageInfo } from '../packageInfo';
import { isString, isObject } from 'lodash';
import { AppInfo } from '../types';
//const debug = require('debug')('toro:config');

// Find project root from current working directory.
function getProjectRoot(): string {
  let currentDir = process.cwd();
  while (!fs.existsSync(currentDir + '/package.json') && currentDir) {
    currentDir = path.dirname(currentDir);
  }
  if (!currentDir) {
    throw new Error('no project root is found.');
  }
  return currentDir;
}

dotenv.config();

nconf.argv({
  parseValues: true,
});

nconf.env({
  separator: '__',
  parseValues: true,
  lowerCase: true,
});

const DEFAULT_KEY_PREFIX = 'alpen';

const baseConfigPath = global.process.env.CONFIG_PATH || getProjectRoot();
const environment = global.process.env.NODE_ENV || 'development';

const isTest = process.env.NODE_ENV === 'test';
const isDevelopment = process.env.NODE_ENV === 'development';

nconf.file(
  'default-env',
  path.join(baseConfigPath, 'env', `config.${environment}.json`),
);
nconf.file('defaults', path.join(baseConfigPath, 'defaults.json'));

function processTemplate(tpl: any): any {
  function get(name: string): any {
    const convertedName = name.split('.').join(':');
    return nconf.get(convertedName);
  }

  function replacer(required = false) {
    return function (match, varName: string): any {
      const vars = varName.split('|');
      for (let i = 0; i < vars.length; i += 1) {
        const val = get(vars[i]);
        if (val) {
          return val;
        }
      }

      if (!required) {
        return '';
      }

      throw new Error(
        `Cannot replace config variable "${varName}" in "${tpl}" because it is undefined`,
      );
    };
  }

  if (isString(tpl)) {
    return tpl
      .replace(/!{{\s*([\w.|]+)}}/g, replacer(true))
      .replace(/{{{\s*([\w.]+)}}}/g, (match, content) => `{{${content}}}`)
      .replace(/{{\s*([\w.|]+)}}/g, replacer());
  } else if (Array.isArray(tpl)) {
    return tpl.map(processTemplate);
  } else if (isObject(tpl)) {
    const obj = {};
    for (const [key, val] of Object.entries(tpl)) {
      obj[key] = processTemplate(val);
    }
    return obj;
  }
  return tpl;
}

export function getValue(key: string, defaultValue?: any): any {
  const val = nconf.get(key);
  return val ? processTemplate(val) : defaultValue;
}

function getAppInfo(): AppInfo {
  const server = nconf.get('server');
  const env = nconf.get('env');
  const title = nconf.get('title') || 'alpen';
  const brand = nconf.get('brand') || 'GuanimaTech';
  const url = !server
    ? 'localhost'
    : server.host + (server.port ? `:${server.port}` : '');
  return {
    title,
    brand,
    env,
    url,
    version: packageInfo.version,
    author: packageInfo.author,
  };
}

/**
 * values we have to set manually
 */
nconf.set('env', environment);
nconf.set('keyPrefix', global.process.env.KEY_PREFIX || DEFAULT_KEY_PREFIX);

nconf.set('isDevelopment', isDevelopment);
nconf.set('isTest', isTest);
nconf.set('isProduction', !isDevelopment && !isTest);
// todo: timezone
nconf.set('packageInfo', packageInfo);
nconf.set('appInfo', getAppInfo());

// To output this, use DEBUG=pamplona:*,pamplona-config
// debug(nconf.get());

export const config = nconf;
