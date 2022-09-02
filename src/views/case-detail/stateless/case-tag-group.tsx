import React from 'react';
import styled from 'styled-components';
import CaseTag from './case-tag';

interface Props {
  tags: string[];
}

const Container = styled.div`
  display: flex;
`;
const TagWrapper = styled.div`
  &:not(:last-child) {
    margin-right: 8px;
  }
`;

const TagGroup: React.FC<Props> = ({ tags }) => {
  return (
    <Container>
      {tags.map((tag) => (
        <TagWrapper key={tag}>
          <CaseTag tag={tag} />
        </TagWrapper>
      ))}
    </Container>
  );
};

export default TagGroup;
