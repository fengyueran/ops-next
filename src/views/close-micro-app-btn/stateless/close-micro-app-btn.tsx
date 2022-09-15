import React from 'react';
import styled from 'styled-components';
import { CloseOutlined } from '@ant-design/icons';
import { Button } from 'antd';

const CloseButton = styled(Button)`
  background: transparent !important;
  border: none !important;
  :hover {
    background: #40a9ff;
  }
`;

interface Props {
  onClick: () => void;
  disabled: boolean;
}

export const CloseMicroAppBtn: React.FC<Props> = ({ onClick, disabled }) => {
  return (
    <CloseButton
      shape="circle"
      icon={<CloseOutlined style={{ color: disabled ? '#999090' : '#fff' }} />}
      onClick={onClick}
      disabled={disabled}
    />
  );
};
