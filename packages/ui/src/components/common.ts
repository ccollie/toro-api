/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentProps,
  Component,
  FunctionComponent,
  JSXElementConstructor,
  MouseEventHandler,
  SFC,
} from 'react';

export interface CommonProps {
  className?: string;
  'aria-label'?: string;
  'data-test-subj'?: string;
}

export type NoArgCallback<T> = () => T;

export const assertNever = (x: never): never => {
  throw new Error(`Unexpected value ${x}`);
};

/**
 * Wraps Object.keys with proper typescript definition of the resulting array
 */
export function keysOf<T, K extends keyof T>(obj: T): K[] {
  return Object.keys(obj) as K[];
}

export type PropsOf<C> = C extends SFC<infer SFCProps>
  ? SFCProps
  : C extends FunctionComponent<infer FunctionProps>
    ? FunctionProps
    : C extends Component<infer ComponentProps>
      ? ComponentProps
      : never;

// Returns the props of a given HTML element
export type PropsOfElement<
  C extends keyof JSX.IntrinsicElements | JSXElementConstructor<any>
  > = JSX.LibraryManagedAttributes<C, ComponentProps<C>>;

// Utility methods for ApplyClassComponentDefaults
type ExtractDefaultProps<T> = T extends { defaultProps: infer D } ? D : never;
type ExtractProps<
  C extends new (...args: any) => any,
  IT = InstanceType<C>
  > = IT extends Component<infer P> ? P : never;

/**
 * Because of how TypeScript's LibraryManagedAttributes is designed to handle
 * defaultProps (https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html#support-for-defaultprops-in-jsx)
 * we can't directly export the props definition as the defaulted values are not made optional,
 * because it isn't processed by LibraryManagedAttributes. To get around this, we:
 * - remove the props which have default values applied
 * - export (Props - Defaults) & Partial<Defaults>
 */
export type ApplyClassComponentDefaults<
  C extends new (...args: any) => any,
  D = ExtractDefaultProps<C>,
  P = ExtractProps<C>
  > =
// definition of Props that are not defaulted
  Omit<P, keyof D> &
  // definition of Props, made optional, that are have keys in defaultProps
  { [K in keyof D]?: K extends keyof P ? P[K] : never };

/**
 * For components that conditionally render <button> or <a>
 * Convenience types for extending base props (T) and
 * element-specific props (P) with standard clickable properties
 *
 * These will likely be used together, along with `ExclusiveUnion`:
 *
 * type AnchorLike = PropsForAnchor<BaseProps>
 * type ButtonLike = PropsForButton<BaseProps>
 * type ComponentProps = ExclusiveUnion<AnchorLike, ButtonLike>
 * const Component: FunctionComponent<ComponentProps> ...
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type PropsForAnchor<T, P = {}> = T & {
  href?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
} & AnchorHTMLAttributes<HTMLAnchorElement> &
  P;

// eslint-disable-next-line @typescript-eslint/ban-types
export type PropsForButton<T, P = {}> = T & {
  onClick?: MouseEventHandler<HTMLButtonElement>;
} & ButtonHTMLAttributes<HTMLButtonElement> &
  P;
