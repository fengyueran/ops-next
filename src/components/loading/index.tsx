import React from 'react';
import styled from 'styled-components';
import { Spin } from 'antd';
import { FormattedMessage } from 'react-intl';

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0;
  background: rgba(0, 0, 0, 0.4);
  position: absolute;
  z-index: 99999;
`;

interface Props {
  loading: boolean;
}

export const Loading: React.FC<Props> = ({ loading }) => {
  if (!loading) return null;
  return (
    <Container>
      <Spin tip={<FormattedMessage defaultMessage="加载中..." />} />
    </Container>
  );
};
