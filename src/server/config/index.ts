import nconf from 'nconf';
import path from 'path';
import { packageInfo } from '../packageInfo';
import { isString, isObject } from 'lodash';
//const debug = require('debug')('toro:config');

nconf.argv({
  parseValues: true,
});

nconf.env({
  separator: '__',
  parseValues: true,
  lowerCase: true,
});

const baseConfigPath = global.process.env.CONFIG_PATH || __dirname;
const environment = global.process.env.NODE_ENV || 'development';

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

export function getValue(key: string, defaultValue: any): any {
  const val = nconf.get(key);
  return val ? processTemplate(val) : defaultValue;
}

/**
 * values we have to set manually
 */
nconf.set('env', environment);

// todo: timezone
nconf.set('packageInfo', packageInfo);

nconf.getValue = getValue;

// To output this, use DEBUG=pamplona:*,pamplona-config
// debug(nconf.get());

export default nconf;
