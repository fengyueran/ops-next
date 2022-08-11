import React from 'react';
import { Button } from 'antd';
import { FormattedMessage } from 'react-intl';

interface Props {
  disabled: boolean;
  onClick: () => void;
}

export const OpenToolBtn: React.FC<Props> = ({ disabled, onClick }) => {
  return (
    <Button onClick={onClick} disabled={disabled}>
      {<FormattedMessage defaultMessage="编辑" />}
    </Button>
  );
};
