import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Button, Empty } from 'antd';
import { DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { FormattedMessage } from 'react-intl';

import { Row, Col, ElasticBox } from 'src/components';

const ModalContainer = styled(Col)`
  width: 100vw;
  height: 100vh;
  background: #fff;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
`;

const StyledButton = styled(Button)`
  font-size: 14px;
  color: #1890ff;
  text-align: center;
  line-height: 22px;
  font-weight: 400;
`;

const CloseBtn = styled(CloseOutlined)`
  margin: 0 16px 0 8px;
  width: 16px;
  font-size: 16px;
`;

const Header = styled(Row)`
  height: 56px;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 0 24px;
`;

const Title = styled.span`
  font-family: PingFangSC-Medium;
  font-size: 16px;
  color: rgba(0, 0, 0, 0.85);
  line-height: 24px;
  font-weight: 500;
`;

const Content = styled.div`
  padding: 24px;
  height: calc(100vh - 56px);
  overflow: auto;
  white-space: pre-wrap;
`;

const StyledBtn = styled(Button)`
  width: 16px;
  margin-right: 10px;
`;

interface Props {
  log: string | null;
  visible: boolean;
  onClose: () => void;
  onClick: () => void;
  onSave: () => void;
}

export const Log: React.FC<Props> = ({ onClose, onClick, onSave, visible, log }) => {
  const renderLog = useCallback(() => {
    if (log === null || log) return log;
    return <Empty description={<FormattedMessage defaultMessage="没有日志" />} />;
  }, [log]);

  return (
    <>
      <StyledButton type="text" onClick={onClick}>
        <FormattedMessage defaultMessage="查看log" />
      </StyledButton>
      {visible && (
        <ModalContainer>
          <Header>
            <CloseBtn onClick={onClose} />
            <Title>
              <FormattedMessage defaultMessage="查看日志" />
            </Title>
            <ElasticBox />
            <StyledBtn icon={<DownloadOutlined />} type="text" onClick={onSave} disabled={!log} />
          </Header>
          <Content>{renderLog()}</Content>
        </ModalContainer>
      )}
    </>
  );
};
