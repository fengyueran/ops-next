import React from 'react';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';

const TagContainer = styled.div`
  display: flex;
`;

const Tag = styled.div<{ highlight: boolean }>`
  padding: 0px 9px;
  font-size: 12px;
  border: 1px solid;
  background: ${({ highlight }) => (highlight ? `rgb(255, 241, 240)` : `rgb(250, 250, 250)`)};
  color: ${({ highlight }) => (highlight ? `rgb(245, 34, 45)` : `rgba(0, 0, 0, 0.85)`)};
  border-color: ${({ highlight }) => (highlight ? `rgb(255, 163, 158)` : `rgb(217, 217, 217)`)};
  border-radius: 2px;
  margin-right: 8px;
`;

interface Props {
  tags: string[];
}

export const TagList: React.FC<Props> = ({ tags }) => {
  return (
    <TagContainer>
      {tags.map((tagName) => {
        const name = tagName === 'cancel' ? <FormattedMessage defaultMessage="废弃" /> : tagName;
        return (
          <Tag key={tagName} highlight={tagName === 'QCF'}>
            {name}
          </Tag>
        );
      })}
    </TagContainer>
  );
};
