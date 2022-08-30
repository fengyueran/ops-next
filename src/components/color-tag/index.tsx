import React from 'react';
import styled from 'styled-components';

import { Row } from '../flex-box';

const Container = styled(Row)`
  align-items: center;
`;

const Circle = styled.div<{ color: string }>`
  width: 6px;
  height: 6px;
  background: ${(props) => props.color};
  border-radius: 3px;
  flex-shrink: 0;
`;

const Tip = styled.span`
  margin-left: 6px;
`;

interface Props {
  color: string;
  tip: string | React.ReactElement;
}

export const ColorTag: React.FC<Props> = ({ color, tip }) => {
  return (
    <Container>
      <Circle color={color} />
      <Tip>{tip}</Tip>
    </Container>
  );
};
