import React from 'react';
import styled from 'styled-components';
import { Button } from 'antd';
import { FormattedMessage } from 'react-intl';

const StyledButton = styled(Button)`
  width: 116px;
  height: 32px;
`;

interface Props {
  visible: boolean;
  disabled: boolean;
  onClick: () => void;
}

export const PatchSegButton: React.FC<Props> = ({ onClick, visible, disabled }) => {
  if (!visible) return null;
  return (
    <StyledButton type="primary" onClick={onClick} disabled={disabled}>
      <FormattedMessage defaultMessage="回到粗分" />
    </StyledButton>
  );
};
