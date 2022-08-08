import React from 'react';
import styled from 'styled-components';
import { Button } from 'antd';
import { FormattedMessage } from 'react-intl';

import { CloseMicroAppBtn } from 'src/views/close-micro-app-btn';
import { Loading } from 'src/views/tool-loading';
import { microAppMgr } from 'src/utils';
import { Row, ElasticBox } from 'src/components';

const Container = styled.div<{ visible: boolean }>`
  width: 100vw;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: ${(props) => (props.visible ? 1 : -1)};
`;

const StyledHeader = styled(Row)`
  background: rgb(31, 48, 84);
  height: 64px;
  align-items: center;
  padding: 0 32px;
`;

const SubmitButton = styled(Button)`
  width: 116px;
  height: 32px;
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

interface Props {
  visible: boolean;
}

export const ToolWrapper: React.FC<Props> = ({ visible }) => {
  return (
    <Container visible={visible}>
      <StyledHeader>
        <CloseMicroAppBtn />
        <ElasticBox />
        <SubmitButton type="primary" onClick={microAppMgr.submit}>
          <FormattedMessage defaultMessage="提交" />
        </SubmitButton>
      </StyledHeader>
      <ToolContainer>
        <ToolMountNode id="tool-mount-node" />
        <Loading />
      </ToolContainer>
    </Container>
  );
};
