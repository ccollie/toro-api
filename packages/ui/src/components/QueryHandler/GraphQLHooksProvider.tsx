import React from 'react';
import {
  OperationVariables,
  QueryHookOptions,
  QueryResult,
  MutationHookOptions,
  MutationTuple,
} from '@apollo/client';
import type { DocumentNode } from 'graphql';

type TUseQueryType = typeof useQuery;
type TUseMutationType = typeof useMutation;

type DefaultUseQueryType = <TData = any, TVariables = OperationVariables>(
  query: DocumentNode,
  options?: QueryHookOptions<TData, TVariables>
) => QueryResult<TData, TVariables>;

type DefaultUseMutationType = <TData = any, TVariables = OperationVariables>(
  mutation: DocumentNode,
  options?: MutationHookOptions<TData, TVariables>
) => MutationTuple<TData, TVariables>;

export interface GraphQLHooks<
  TuseQuery = DefaultUseQueryType,
  TuseMutation = DefaultUseMutationType
> {
  useQuery: TuseQuery;
  useMutation: TuseMutation;
}

export const GraphQLHooksContext = React.createContext<GraphQLHooks>({
  useQuery: () => {
    throw new Error('You must register a useQuery hook via the `GraphQLHooksProvider`');
  },
  useMutation: () => {
    throw new Error('You must register a useMutation hook via the `GraphQLHooksProvider`');
  },
});

interface GraphQlHooksProviderProps<TuseQuery = TUseQueryType, TuseMutation = TUseMutationType>
  extends GraphQLHooks<TuseQuery, TuseMutation> {
  children: React.ReactNode;
}

/**
 * GraphQLHooksProvider stores standard `useQuery` and `useMutation` hooks for Redwood
 * that can be mapped to your GraphQL library of choice's own `useQuery`
 * and `useMutation` implementation.
 *
 * @todo Let the user pass in the additional type for options.
 */
export const GraphQLHooksProvider = <
  TuseQuery extends DefaultUseQueryType,
  TuseMutation extends DefaultUseMutationType
>({
  useQuery,
  useMutation,
  children,
}: GraphQlHooksProviderProps<TuseQuery, TuseMutation>) => {
  return (
    <GraphQLHooksContext.Provider
      value={{
        useQuery,
        useMutation,
      }}
    >
      {children}
    </GraphQLHooksContext.Provider>
  );
};

export function useQuery<TData = any, TVariables = OperationVariables>(
  query: DocumentNode,
  options?: QueryHookOptions<TData, TVariables>
): QueryResult<TData, TVariables> {
  return React.useContext(GraphQLHooksContext).useQuery<TData, TVariables>(query, options);
}

export function useMutation<TData = any, TVariables = OperationVariables>(
  mutation: DocumentNode,
  options?: MutationHookOptions<TData, TVariables>
): MutationTuple<TData, TVariables> {
  return React.useContext(GraphQLHooksContext).useMutation<TData, TVariables>(mutation, options);
}
