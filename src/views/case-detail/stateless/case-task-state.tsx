import React from 'react';
import styled from 'styled-components';

interface Props {
  passed: boolean;
}

interface StateProps {
  bgColor: string;
  text: string;
  textColor: string;
}

const Label = styled.div<StateProps>`
  padding: 0px 9px;
  font-size: 12px;
  background: ${(p) => p.bgColor};
  color: ${(p) => p.textColor};
  border-radius: 2px;
  display: flex;
  justify-content: center;
  align-items: center;
  &::after {
    content: '${(p) => p.text}';
  }
`;

const TaskState: React.FC<Props> = ({ passed }) => {
  if (passed) {
    return <Label bgColor="rgba(82,196,26,0.15)" text="PASS" textColor="#52C41A" />;
  }
  return <Label bgColor="rgba(245,34,45,0.15)" text="FAIL" textColor="#F5222D" />;
};

export default TaskState;
