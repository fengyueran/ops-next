import React from 'react';
import { Dropdown, Menu } from 'antd';
import { EllipsisOutlined } from '@ant-design/icons';

import DownloadDataMenu from './download-data-menu';

interface Props {
  caseInfo: CaseInfo;
}

const OPDropdown: React.FC<Props> = ({ caseInfo }) => {
  return (
    <Dropdown
      trigger={['click']}
      overlay={
        <Menu>
          <DownloadDataMenu caseInfo={caseInfo} />
        </Menu>
      }
    >
      <EllipsisOutlined style={{ marginRight: 50, fontSize: 16 }} />
    </Dropdown>
  );
};

export default OPDropdown;
