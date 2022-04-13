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
  label,
  labelPosition = 'right',
  text,
  button,
  fontSize,
  customIcon,
  mode,
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
      {text && (
        <HeaderWrapper size={size} fontSize={fontSize}>
          {text}
        </HeaderWrapper>
      )}
      <TextWrapper labelPosition={labelPosition}>{label}</TextWrapper>
      {button && <ButtonWrapper>{button}</ButtonWrapper>}
    </EmptyStatesWrapper>
  );
};
export default EmptyStates;
