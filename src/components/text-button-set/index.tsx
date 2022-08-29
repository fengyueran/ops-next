import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Button } from 'antd';

import { Row } from 'src/components';

const StyledRow = styled(Row)`
  height: 68px;
  align-items: center;
`;

const StyledButton = styled(Button)<{ selected: boolean }>`
  height: 24px;
  background: ${({ selected }) => (selected ? '#1890ff' : 'none')};
  border-radius: 2px;
  font-size: 14px;
  color: ${({ selected }) => (selected ? '#ffffff' : 'rgba(0,0,0,0.85)')};
  line-height: 24px;
  font-weight: 400;
  padding: 0 10px;
  margin-right: 14px;
`;

interface ListItem {
  name: string;
  [key: string]: any;
}
interface Props {
  onClick: (name: string) => void;
  list: ListItem[];
  selectedList: string[];
}

export const TextBtnSet: React.FC<Props> = ({ list, selectedList, onClick }) => {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const id = (e.target as HTMLDivElement).getAttribute('data-id');
      onClick(id!);
    },
    [onClick],
  );

  return (
    <StyledRow onClick={handleClick}>
      {list.map(({ name }) => {
        const selected = selectedList.indexOf(name) >= 0;
        return (
          <StyledButton type="text" data-id={name} selected={selected}>
            {name}
          </StyledButton>
        );
      })}
    </StyledRow>
  );
};
