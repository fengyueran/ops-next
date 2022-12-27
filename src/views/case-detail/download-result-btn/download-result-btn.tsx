import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'antd';

interface Props {
  onClick: () => void;
}

const DownloadResultBtn: React.FC<Props> = ({ onClick }) => {
  return (
    <Button size="small" style={{ marginRight: 10 }} onClick={onClick}>
      <FormattedMessage defaultMessage="下载精分后数据" />
    </Button>
  );
};

export default DownloadResultBtn;
