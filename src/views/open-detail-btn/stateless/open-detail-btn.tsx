import React from 'react';
import styled from 'styled-components';
import { Button } from 'antd';
import { FormattedMessage } from 'react-intl';

const StyledButton = styled(Button)`
  height: 32px;
  color: #2084f8;
`;

interface Props {
  disabled: boolean;
  onClick: () => void;
}

export const OpenDetailButton: React.FC<Props> = ({ onClick, disabled }) => {
  return (
    <StyledButton type="text" onClick={onClick} disabled={disabled}>
      <FormattedMessage defaultMessage="查看" />
    </StyledButton>
  );
};
