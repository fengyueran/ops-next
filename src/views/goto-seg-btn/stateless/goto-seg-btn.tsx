import React from 'react';
import styled from 'styled-components';
import { Button } from 'antd';
import { FormattedMessage } from 'react-intl';

const StyledButton = styled(Button)`
  width: 116px;
  height: 32px;
`;

interface Props {
  disabled: boolean;
  onClick: () => void;
}

export const GotoSegBtn: React.FC<Props> = ({ onClick, disabled }) => {
  return (
    <StyledButton type="primary" onClick={onClick} disabled={disabled}>
      <FormattedMessage defaultMessage="回到粗分" />
    </StyledButton>
  );
};
