import React from 'react';
import styled from 'styled-components';

import { CloseMicroAppBtn } from 'src/views/close-micro-app-btn';

const Container = styled.div<{ visible: boolean }>`
  width: 100vw;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: ${(props) => (props.visible ? 1 : -1)};
`;

const StyledHeader = styled.div`
  background: rgb(31, 48, 84);
  height: 64px;
`;

const ToolMountNode = styled.div`
  width: 100vw;
  height: calc(100vh - 64px);
  background: #000;
`;

interface Props {
  visible: boolean;
}

export const ToolWrapper: React.FC<Props> = ({ visible }) => {
  return (
    <Container visible={visible}>
      <StyledHeader>
        <CloseMicroAppBtn />
      </StyledHeader>
      <ToolMountNode id="tool-mount-node" />
    </Container>
  );
};
