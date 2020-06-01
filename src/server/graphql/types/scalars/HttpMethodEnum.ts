import { GraphQLEnumType } from 'graphql';

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
}

export const HttpMethodType = new GraphQLEnumType({
  name: 'HttpMethodEnum',
  values: {
    GET: { value: HttpMethod.GET },
    POST: { value: HttpMethod.POST },
  },
});
