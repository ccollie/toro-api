import { EnumTypeComposer, schemaComposer } from 'graphql-compose';

export type Enum<E> = Record<keyof E, number | string> & {
  [k: number]: string;
};

export function createEnumFromTS<E>(
  enumType: Enum<E>,
  name: string,
  description?: string,
): EnumTypeComposer<any> {
  const values: Record<string, any> = Object.create(null);
  const keys = Object.keys(enumType);

  keys.forEach((k) => {
    // ignore numeric keys
    if (!isNaN(parseInt(k))) return;
    values[k] = { value: enumType[k] };
  });
  return schemaComposer.createEnumTC({
    name,
    values,
    description,
  });
}
