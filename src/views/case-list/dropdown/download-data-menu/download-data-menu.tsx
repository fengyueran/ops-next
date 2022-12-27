import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Menu } from 'antd';

interface Props {
  disabled: boolean;
  onClick: () => void;
}

const DownloadDataMenu: React.FC<Props> = ({ disabled, onClick }) => {
  return (
    <Menu.Item disabled={disabled} onClick={onClick}>
      <FormattedMessage defaultMessage={'下载数据'} />
    </Menu.Item>
  );
};

export default DownloadDataMenu;
