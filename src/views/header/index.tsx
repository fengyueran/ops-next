import React from 'react';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';

const Container = styled.div`
  font-family: PingFangSC-Regular;
  font-size: 18px;
  color: rgba(0, 0, 0, 0.85);
  font-weight: 400;
`;

export const Header = () => (
  <Container>
    <FormattedMessage defaultMessage="全部任务" />
  </Container>
);
