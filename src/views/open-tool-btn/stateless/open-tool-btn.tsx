import React from 'react';
import { Button } from 'antd';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';

const StyledButton = styled(Button)<{ loading: boolean }>`
  color: ${(props) => (props.loading ? '#2084f8' : 'rgba(0,0,0,.85)')};
  border-color: ${(props) => (props.loading ? '#2084f8' : '#d9d9d9')};
`;

interface Props {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

export const OpenToolBtn: React.FC<Props> = ({ disabled, loading, onClick }) => {
  return (
    <StyledButton onClick={onClick} disabled={loading ? false : disabled} loading={loading}>
      {loading ? (
        <FormattedMessage defaultMessage="处理中" />
      ) : (
        <FormattedMessage defaultMessage="编辑" />
      )}
    </StyledButton>
  );
};
