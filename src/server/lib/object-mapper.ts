import handlebars from 'handlebars';
import { get, set, isFunction } from 'lodash';

const QuotedStringRE = /^"(?:[^"\\]|\\.)*"$/;
const MustacheRE = /{{[{]?(.*?)[}]?}}/;

export interface MapperOptions {
  ignoreUndefined: boolean;
}

export type MapperDelegate = (obj: Record<string, any>) => Record<string, any>;
export type MapperFn = (data: Record<string, any>) => any;

export const NullMapper: MapperDelegate = (data) => ({ ...data });

export function compile(
  mapping: Record<string, any>,
  options: MapperOptions = {
    ignoreUndefined: true,
  },
): MapperDelegate {
  const handlers: Array<[path: string, fn: MapperFn]> = [];

  function getHandlebarsMapper(template: string): MapperFn {
    return handlebars.compile(template);
  }

  function getLiteralMapper(val: unknown): MapperFn {
    return () => val;
  }

  function getObjectPathMapper(
    path: string | Array<string | number>,
  ): MapperFn {
    return (data: Record<string, any>) => get(data, path);
  }

  function getFunctionMapper(dest: string, fn): MapperFn {
    return (data: Record<string, any>) => {
      return fn(data, dest);
    };
  }

  function exec(data: Record<string, any>): Record<string, any> {
    const obj = Object.create(null);
    let i = 0;
    for (; i < handlers.length; i++) {
      const [dest, fn] = handlers[i];
      const val = fn(data);
      // todo: have option no to include null values
      if (val === undefined && options.ignoreUndefined) {
        continue;
      }
      set(obj, dest, val);
    }
    return obj;
  }

  for (const destination in mapping) {
    if (mapping.hasOwnProperty(destination)) {
      let mapperFn: MapperFn;
      const valueOrPath = mapping[destination];
      // todo: disallow Symbol and Regex
      if (typeof valueOrPath === 'string') {
        if (MustacheRE.test(valueOrPath)) {
          // compile handlebars
          mapperFn = getHandlebarsMapper(valueOrPath);
        } else {
          const m = QuotedStringRE.exec(valueOrPath);
          if (m?.[0]) {
            const literal = valueOrPath.substr(1, valueOrPath.length - 2);
            mapperFn = getLiteralMapper(literal);
          } else {
            // todo: validate path ?
            mapperFn = getObjectPathMapper(valueOrPath);
          }
        }
      } else if (isFunction(valueOrPath)) {
        mapperFn = getFunctionMapper(destination, valueOrPath);
      } else if (Array.isArray(valueOrPath)) {
        mapperFn = getObjectPathMapper(valueOrPath);
      } else {
        mapperFn = getLiteralMapper(valueOrPath);
      }
      handlers.push([destination, mapperFn]);
    }
  }

  return exec;
}
