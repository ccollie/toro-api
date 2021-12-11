import * as dotenv from 'dotenv';
import { get as lget, set as lset, isString, isObject } from 'lodash';
import { packageInfo } from '../packageInfo';
import { AppInfo } from '../types';

dotenv.config();

const DEFAULT_KEY_PREFIX = 'alpen';
const env = global.process.env.NODE_ENV || 'development';


/**
 * Determines if log environment is test
 *
 * @type {boolean}
 *
 */
const isTest = env === 'test';

/**
 * Determines if log environment is development
 *
 * @type {boolean}
 *
 */
const isDevelopment = env === 'development';

/**
 * Determines if log environment is production by checking if not development
 *
 * @type {boolean}
 *
 */
const isProduction = !isTest && !isDevelopment;

const SEPARATOR = '__';

function getPath(key: string): string[] {
  return !key ? [] : key.toUpperCase().split(SEPARATOR);
}

let loaded = false;
const store: Record<string, any> = {};


function parseValues(value: string): unknown {
  let val = value;
  try {
    val = JSON.parse(value);
  } catch (ignore) {
    // Check for any other well-known strings that should be "parsed"
    if (value === 'undefined'){
      val = void 0;
    }
  }

  return val;
}

function loadEnv(): Record<string, any> {
  if (!loaded) {
    Object.keys(process.env).forEach((key) => {
      const paths = getPath(key);
      const value = parseValues(process.env[key]);
      lset(store, paths, value);
    });
    loaded = true;
  }
  return store;
}

function get(key: string): any {
  if (!loaded) loadEnv();
  if (key === null) return null;
  return lget(store, key);
}

function processTemplate(tpl: any): any {

  function replacer(required = false) {
    return function (_: string, varName: string): any {
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

function getValue(key: string, defaultValue?: any): any {
  const val = get(key);
  return val ? processTemplate(val) : defaultValue;
}

function getAppInfo(): AppInfo {
  const server = get('server');
  const title = get('title') || 'alpen';
  const brand = get('brand') || 'GuanimaTech';
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

const keyPrefix = global.process.env.KEY_PREFIX || DEFAULT_KEY_PREFIX;
const appInfo = getAppInfo();

export {
  get,
  getValue,
  appInfo,
  env,
  isDevelopment,
  isProduction,
  isTest,
  keyPrefix,
  packageInfo
};

