import React from 'react';
import styled from 'styled-components';
import { CloseOutlined } from '@ant-design/icons';
import { Button } from 'antd';

const CloseButton = styled(Button)`
  background: transparent;
  border: none;
  :hover {
    background: #40a9ff;
  }
`;

interface Props {
  onClick: () => void;
}

export const CloseMicroAppBtn: React.FC<Props> = ({ onClick }) => {
  return (
    <CloseButton
      shape="circle"
      icon={<CloseOutlined style={{ color: '#fff' }} />}
      onClick={onClick}
    />
  );
};
