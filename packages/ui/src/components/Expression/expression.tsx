/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  ButtonHTMLAttributes,
  HTMLAttributes,
  MouseEventHandler,
  ReactNode,
  FunctionComponent,
} from 'react';
import classNames from 'clsx';
import { ExclusiveUnion } from '@/types';
import { CommonProps, keysOf } from 'src/components/common';
import { ExclamationTriangleIcon } from 'src/components/Icons';

const colorToClassNameMap = {
  subdued: 'euiExpression--subdued',
  primary: 'euiExpression--primary',
  success: 'euiExpression--success',
  accent: 'euiExpression--accent',
  warning: 'euiExpression--warning',
  danger: 'euiExpression--danger',
};

const textWrapToClassNameMap = {
  'break-word': null,
  truncate: 'euiExpression--truncate',
};

export const COLORS = keysOf(colorToClassNameMap);

export type ExpressionColor = keyof typeof colorToClassNameMap;

const displayToClassNameMap = {
  inline: null,
  columns: 'euiExpression--columns',
};

export type ExpressionProps = CommonProps & {
  /**
   * First part of the expression
   */
  description: ReactNode;
  descriptionProps?: HTMLAttributes<HTMLSpanElement>;
  /**
   * Second part of the expression
   */
  value?: ReactNode;
  valueProps?: HTMLAttributes<HTMLSpanElement>;
  /**
   * Color of the `description`
   */
  color?: ExpressionColor;
  /**
   * Should the `description` auto-uppercase?
   */
  uppercase?: boolean;
  /**
   * Adds a solid border at the bottom
   */
  isActive?: boolean;
  /**
   * Turns the component into a button and adds an editable style border at the bottom
   */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /**
   * Sets the display style for the expression. Defaults to `inline`
   */
  display?: keyof typeof displayToClassNameMap;
  /**
   * Forces color to display as `danger` and shows an `alert` icon
   */
  isInvalid?: boolean;
  /**
   * Sets a custom width for the description when using the columns layout.
   * Set to a number for a custom width in `px`.
   * Set to a string for a custom width in custom measurement.
   * Defaults to `20%`
   */
  descriptionWidth?: number | string;
  /**
   * Sets how to handle the wrapping of long text.
   */
  textWrap?: keyof typeof textWrapToClassNameMap;
};

type Buttonlike = ExpressionProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> & {
  onClick: MouseEventHandler<HTMLButtonElement>;
};

type Spanlike = ExpressionProps &
  Omit<HTMLAttributes<HTMLSpanElement>, 'value'>;

export const Expression: FunctionComponent<ExclusiveUnion<
  Buttonlike,
  Spanlike
  >> = ({
          className,
          description,
          descriptionProps,
          value,
          valueProps,
          color = 'success',
          uppercase = true,
          isActive = false,
          display = 'inline',
          descriptionWidth = '20%',
          onClick,
          isInvalid = false,
          textWrap = 'break-word',
          ...rest
        }) => {
  const calculatedColor = isInvalid ? 'danger' : color;

  const classes = classNames(
    'expression',
    className,
    {
      'euiExpression-isActive': isActive,
      'euiExpression-isClickable': onClick,
      'euiExpression-isUppercase': uppercase,
    },
    displayToClassNameMap[display],
    colorToClassNameMap[calculatedColor],
    textWrapToClassNameMap[textWrap]
  );

  const Component = onClick ? 'button' : 'span';

  const descriptionStyle = descriptionProps && descriptionProps.style;
  const customWidth =
    display === 'columns' && descriptionWidth
      ? {
        flexBasis: descriptionWidth,
        ...descriptionStyle,
      }
      : undefined;

  const invalidIcon = isInvalid ? (
    <ExclamationTriangleIcon
      className="euiExpression__icon"
      color={calculatedColor}/>
  ) : undefined;

  return (
    <Component className={classes} onClick={onClick} {...rest}>
      <span
        className="euiExpression__description"
        style={customWidth}
        {...descriptionProps}
      >
        {description}
      </span>{' '}
      {value && (
        <span className="euiExpression__value" {...valueProps}>
          {value}
        </span>
      )}
      {invalidIcon}
    </Component>
  );
};
