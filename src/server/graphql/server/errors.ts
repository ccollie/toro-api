import Boom from '@hapi/boom';
import config from '../../config';
import { get, isEmpty } from 'lodash';
import errorFormatter from 'node-error-formatter';

const isProduction = config.get('env') === 'production';
const PublicDataPath = 'data';

const ErrorStatusMap = {
  SyntaxError: 400,
  ValidationError: 400,
  UserInputError: 400,
  AuthenticationError: 401,
  ForbiddenError: 403,
  PersistedQueryNotFoundError: 404,
  PersistedQueryNotSupportedError: 501,
};

const ErrorCodeMap = new Map([
  [400, 'BAD_REQUEST'],
  [401, 'UNAUTHORIZED'],
  [403, 'FORBIDDEN'],
  [404, 'NOT_FOUND'],
  [408, 'REQUEST_TIMEOUT'],
  [409, 'CONFLICT'],
  [410, 'RESOURCE_GONE'],
  [416, 'RANGE_ERROR'],
  [423, 'LOCKED'],
  [429, 'TOO_MANY_REQUESTS'],
  [451, 'LEGAL'],
  [500, 'INTERNAL_SERVER_ERROR'],
  [501, 'NOT_IMPLEMENTED'],
  [502, 'BAD_GATEWAY'],
  [503, 'SERVICE_UNAVAILABLE'],
  [504, 'GATEWAY_TIMEOUT'],
  [511, 'NETWORK_AUTH_REQUIRED'],
]);

export function formatGraphqlError(graphqlError): any {
  const hideSensitiveData = isProduction;
  let err = graphqlError.originalError || graphqlError;

  const finalError: Record<string, any> = {
    locations: graphqlError.locations,
    path: graphqlError.path,
    message: graphqlError.message,
  };

  const extensions = Object.create(null);

  if (!err.isBoom) {
    const transformed = errorFormatter.create(err);
    err = Boom.boomify(transformed, { statusCode: transformed.statusCode });
  }
  const payload = err.output.payload;
  if (!err.isServer || !hideSensitiveData) {
    const data = get(err, PublicDataPath, {});
    if (data) extensions.data = data;
  }
  extensions.statusCode =
    payload.statusCode || ErrorStatusMap[graphqlError.name] || 500;

  if (extensions.statusCode) {
    const code = ErrorCodeMap.get(extensions.statusCode);
    if (code) {
      extensions.code = code;
    }
  } else if (graphqlError.extensions && graphqlError.extensions.code) {
    extensions.code = graphqlError.extensions.code;
  }

  if (!hideSensitiveData) {
    let stackTrace = graphqlError?.extensions?.exception?.stacktrace;
    stackTrace = stackTrace || err.stack || err.stacktrace;
    if (stackTrace) {
      extensions.stacktrace = stackTrace;
    }
  }
  if (!isEmpty(extensions)) {
    finalError.extensions = extensions;
  }

  return finalError;
}
