import { GraphQLEnumType } from 'graphql';

export enum SortOrderEnum {
  ASC = 'ASC',
  DESC = 'DESC',
}

export const OrderEnumType = new GraphQLEnumType({
  name: 'SortOrderEnum',
  values: {
    ASC: { value: SortOrderEnum.ASC },
    DESC: { value: SortOrderEnum.DESC },
  },
});
