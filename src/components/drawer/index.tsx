import React from 'react';
import { Drawer as AntdDrawer } from 'antd';

interface Props {
  visible: boolean;
  onClose: () => void;
  children?: React.ReactElement;
}

export const Drawer: React.FC<Props> = ({ visible, children, onClose }) => {
  return (
    <AntdDrawer
      visible={visible}
      placement="right"
      closable={false}
      onClose={onClose}
      width={663}
      bodyStyle={{
        padding: 0,
      }}
    >
      {children}
    </AntdDrawer>
  );
};
