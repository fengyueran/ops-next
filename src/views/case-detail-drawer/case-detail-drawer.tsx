import React from 'react';

import { Drawer } from 'src/components';
import { CaseDetail } from '../case-detail';
interface Props {
  visible: boolean;
  closeDrawer: () => void;
  children?: React.ReactElement;
}

export const CaseDetailDrawer: React.FC<Props> = ({ visible, children, closeDrawer }) => {
  return (
    <Drawer visible={visible} onClose={closeDrawer}>
      <CaseDetail />
    </Drawer>
  );
};
