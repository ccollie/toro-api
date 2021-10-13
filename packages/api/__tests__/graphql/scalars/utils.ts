import { graphql, GraphQLSchema, Source } from 'graphql';
import { GraphQLError } from 'graphql/error/GraphQLError';
import { get } from 'lodash';

export interface Result<TData = Record<string, any>> {
  errors?: ReadonlyArray<GraphQLError>;
  data?: TData | null;
}

export async function exec<TData = any>(
  schema: GraphQLSchema,
  source: string | Source,
  rootValue?: any,
  contextValue?: any,
  variableValues?: { [p: string]: any },
): Promise<Result<TData>> {
  //
  const res = await graphql(
    schema,
    source,
    rootValue,
    contextValue,
    variableValues,
  );
  const data = res['data'] ? (res['data'] as TData) : null;
  const errors = res['errors'];
  return {
    data,
    errors,
  };
}

export function extractError(err: any): any {
  const path = 'originalError.output.payload';
  return get(err, path);
}
