import * as React from 'react';
import Icon from '../Icon';
import {
  ButtonWrapper,
  EmptyStatesIconContainer,
  EmptyStatesWrapper,
  HeaderWrapper,
  StatusIconContainer,
  TextWrapper,
} from './EmptyStates.styles';
import { EmptyStatesProps, EmptyStatesSize } from './EmptyStates.types';

const mapSizeToPx = {
  [EmptyStatesSize.SMALL]: 48,
  [EmptyStatesSize.MEDIUM]: 96,
};

const EmptyStates: React.FC<EmptyStatesProps> = ({
  size = EmptyStatesSize.SMALL,
  content,
  labelPosition = 'right',
  title,
  button,
  fontSize,
  customIcon,
  mode,
  children
}) => {
  return (
    <EmptyStatesWrapper
      mode={mode}
      className="ds-empty-states"
      labelPosition={labelPosition}
    >
      <EmptyStatesIconContainer size={size}>
        <StatusIconContainer>
          <Icon component={customIcon} size={mapSizeToPx[size]} />
        </StatusIconContainer>
      </EmptyStatesIconContainer>
      {title && (
        <HeaderWrapper size={size} fontSize={fontSize}>
          {title}
        </HeaderWrapper>
      )}
      <TextWrapper labelPosition={labelPosition}>{content}</TextWrapper>
      {children}
      {button && <ButtonWrapper>{button}</ButtonWrapper>}
    </EmptyStatesWrapper>
  );
};
export default EmptyStates;
