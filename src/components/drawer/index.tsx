import React from 'react';
import styled from 'styled-components';

import { Row } from '../flex-box';

const Container = styled(Row)`
  position: fixed;
  top: 0;
  height: 100vh;
  width: 100vw;
  left: 0;
  z-index: 10000;
  display: flex;
`;

const Mask = styled.div`
  background: rgba(0, 0, 0, 0.45);
  flex-grow: 1;
`;

const Content = styled.div`
  width: 663px;
  background: #fff;
`;
interface Props {
  visible: boolean;
  onClose: () => void;
  children?: React.ReactElement;
}

export const Drawer: React.FC<Props> = ({ visible, children, onClose }) => {
  if (!visible) return null;

  return (
    <Container>
      <Mask onClick={onClose} />
      <Content>{children}</Content>
    </Container>
  );
};
