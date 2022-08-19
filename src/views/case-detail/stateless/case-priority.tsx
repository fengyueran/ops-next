import React from 'react';
import styled from 'styled-components';
import { Priority } from 'src/type';
import ssIcon from 'src/assets/icons/ss.svg';
import s0Icon from 'src/assets/icons/s0.svg';
import s1Icon from 'src/assets/icons/s1.svg';

interface Props {
  priority: Priority;
}

const Container = styled.div`
  user-select: none;
  margin-top: -8px;
`;
const Icon = styled.img`
  height: 20px;
`;
const Label = styled.span`
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
`;

const priorityTable: Record<Priority, { image: string }> = {
  [Priority.Low]: {
    image: s1Icon,
  },
  [Priority.Medium]: {
    image: s0Icon,
  },
  [Priority.High]: {
    image: ssIcon,
  },
};

const CasePriority: React.FC<Props> = ({ priority }) => {
  const data = priorityTable[priority];
  if (!data) {
    return <Label>{priority}</Label>;
  }
  const { image } = data;
  return (
    <Container>
      <Icon src={image} />
    </Container>
  );
};

export default CasePriority;
