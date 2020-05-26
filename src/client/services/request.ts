import AppError from '../common/appError';
import { isDate, isEmpty, joinPath, safeParse } from '../common/utils';
import { RequestData } from './types';

interface ParameterDictionary {
  [name: string]: any;
}

export type Method =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'HEAD'
  | 'DELETE'
  | 'OPTIONS'
  | 'TRACE'
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'head'
  | 'delete'
  | 'options'
  | 'trace';

/**
 * @param data additional parameters for request
 */
function getQueryString(data: ParameterDictionary): string {
  if (isEmpty(data)) {
    return null;
  }
  const temp = {};
  // eslint-disable-next-line prefer-const
  for (let [key, value] of Object.entries(data)) {
    if (isDate(value)) {
      value = (value as Date).getTime();
    }
    temp[key] = value;
  }
  const params = new URLSearchParams(temp);
  return params.toString();
}

async function decodeBody(response): Promise<any> {
  const text = await response.text();
  if (text && text.length && text !== response.statusText) {
    try {
      return JSON.parse(text);
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.log(e);
    }
  }
  return {};
}

async function handleErrorResponse(response) {
  const body = await decodeBody(response);
  let message = body.message;
  if (!message) {
    message = response.payload && response.payload.message;
  }
  message = message || 'The server responded with an unexpected stats.';
  const err = new AppError(response.statusCode, message);
  if (body.stack) {
    err.stack = body.stack;
  }
  throw err;
}

class Request {
  private headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  private readonly basePath: string;

  constructor(config) {
    const { requestBasePath } = config;

    this.basePath = requestBasePath;
  }

  /**
   * @param {string} path relative path
   * @param {ParameterDictionary} data additional query parameters
   */
  get(path, data?: RequestData): Promise<any> {
    return this.request('get', path, data);
  }

  /**
   * @param {string} resource
   * @param {string} id
   */
  getById(resource: string, id: string): Promise<any> {
    const path = `${resource}/${id}`;
    return this.get(path);
  }

  /**
   * Perform a post request
   * @param {string} path request relative path
   * @param {RequestData} data request data
   */
  post(path: string, data?: RequestData): Promise<any> {
    return this.request('post', path, data);
  }

  put(path: string, data: RequestData): Promise<any> {
    return this.request('put', path, data);
  }

  patch(path: string, data: RequestData): Promise<any> {
    return this.request('patch', path, data);
  }

  postOne(resource: string, id, action: string, data: RequestData) {
    const path = `${resource}/${id}/${action}`;
    return this.post(path, data);
  }

  remove(path: string): Promise<any> {
    return this.del(path);
  }

  /**
   * Delete a resource
   * @param {string} path relative path
   * @param {ParameterDictionary} data optional query parameters
   */
  del(path: string, data?: ParameterDictionary) {
    return this.request('delete', path, data);
  }

  deleteById(resource: string, id, action: string, data) {
    const path = `${resource}/${id}/${action}`;
    return this.del(path, data);
  }

  /**
   * Internal method to make actual request to backend
   * @param {string} method http method
   * @param {string} path relative request path
   * @param {RequestData} data optional query parameters
   * @param {boolean} isJson
   */
  private async request(
    method: Method,
    path: string,
    data: RequestData,
    isJson = true,
  ): Promise<any> {
    let url = joinPath(this.basePath, path);

    const options = {
      method,
      headers: this.headers,
      body: undefined,
    };

    if (data) {
      for (const i in data) {
        if (data[i] === null || data[i] === undefined) {
          delete data[i];
        }
      }
      if (['get', 'delete'].includes(method)) {
        const qs = getQueryString(data);
        if (qs && qs.length) {
          url = `${url}?${qs}`;
        }
      } else {
        options.body = JSON.stringify(data);
      }
    }

    const response = await fetch(url, options);

    if (response.status !== 200) {
      await handleErrorResponse(response);
    }

    const text = await response.text();
    if (isJson) {
      if (text && text.length && text !== response.statusText) {
        return safeParse(text);
      }
      return {};
    }
    return text;
  }
}

export default Request;
