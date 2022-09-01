import React from 'react';
import styled from 'styled-components';

import { Loading } from 'src/views/tool-loading';
import { Row, ElasticBox, SpaceX } from 'src/components';
import { CloseMicroAppBtn } from 'src/views/close-micro-app-btn';
import { SubmitButton } from 'src/views/submit-btn';
import { GotoSegBtn } from 'src/views/goto-seg-btn';

const Container = styled.div<{ visible: boolean }>`
  width: 100vw;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: ${(props) => (props.visible ? 1001 : -1)};
`;

const StyledHeader = styled(Row)`
  background: rgb(31, 48, 84);
  height: 64px;
  align-items: center;
  padding: 0 32px 0 24px;
`;

const ToolContainer = styled.div`
  width: 100vw;
  background: #000;
  position: relative;
  height: calc(100vh - 64px);
`;

const ToolMountNode = styled.div`
  width: 100%;
  height: 100%;
  #root {
    height: calc(100vh - 64px);
    background: #000;
  }
`;

const Title = styled.div`
  font-family: PingFangSC-Medium;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: -0.1px;
  line-height: 24px;
  font-weight: 500;
  margin-left: 5px;
`;

interface Props {
  title: string;
  visible: boolean;
}

export const ToolWrapper: React.FC<Props> = ({ visible, title }) => {
  return (
    <Container visible={visible}>
      <StyledHeader>
        <CloseMicroAppBtn />
        <Title>{title}</Title>
        <ElasticBox />
        <GotoSegBtn />
        <SpaceX size={24} />
        <SubmitButton />
      </StyledHeader>
      <ToolContainer>
        <ToolMountNode id="tool-mount-node" />
        <Loading />
      </ToolContainer>
    </Container>
  );
};
