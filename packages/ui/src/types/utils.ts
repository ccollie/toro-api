export enum SortOrder {
  asc = 'asc',
  desc = 'desc',
}

export type Merge<T, P> = P & Omit<T, keyof P>;

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export type KeyOf<T> = Array<keyof T>;

export type AnyFunction<T = any> = (...args: T[]) => any

// eslint-disable-next-line @typescript-eslint/ban-types
export type FunctionArguments<T extends Function> = T extends (
    ...args: infer R
  ) => any
  ? R
  : never;


export type Dict<T = any> = Record<string, T>;

export type MaybeRenderProp<P> =
  | React.ReactNode
  | ((props: P) => React.ReactNode);

export type Booleanish = boolean | 'true' | 'false';

export type StringOrNumber = string | number;

export type HTMLProps<T = any> = Omit<
  React.HTMLAttributes<T>,
  'color' | 'width' | 'height'
> &
  React.RefAttributes<T>;

export type PropGetter<T extends HTMLElement = any, P = {}> = (
  props?: Merge<HTMLProps<T>, P>,
  ref?: React.Ref<any> | React.RefObject<any>,
) => Merge<HTMLProps<T>, P>;
