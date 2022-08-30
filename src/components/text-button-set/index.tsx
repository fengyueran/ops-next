import React, { useCallback } from 'react';
import styled from 'styled-components';

import { Row } from 'src/components';

const StyledRow = styled(Row)`
  align-items: center;
`;

const StyledButton = styled.div<{ selected: boolean }>`
  height: 24px;
  background: ${({ selected }) => (selected ? '#1890ff' : 'none')};
  border-radius: 2px;
  font-size: 14px;
  color: ${({ selected }) => (selected ? '#ffffff' : 'rgba(0,0,0,0.85)')};
  line-height: 24px;
  font-weight: 400;
  padding: 0 10px;
  margin-right: 14px;
  user-select: none;
  cursor: pointer;
`;

interface ListItem {
  name: string;
  [key: string]: any;
}
interface Props {
  onClick: (item: ListItem) => void;
  list: ListItem[];
  selectedMap: { [key: string]: boolean };
}

export const TextBtnSet: React.FC<Props> = ({ list, selectedMap, onClick }) => {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const id = (e.target as HTMLDivElement).getAttribute('data-id');
      const found = list.find(({ name }) => name === id);
      if (found) {
        onClick(found);
      }
    },
    [list, onClick],
  );

  return (
    <StyledRow onClick={handleClick}>
      {list.map(({ name }) => {
        const selected = selectedMap[name];
        return (
          <StyledButton key={name} data-id={name} selected={selected}>
            {name}
          </StyledButton>
        );
      })}
    </StyledRow>
  );
};
