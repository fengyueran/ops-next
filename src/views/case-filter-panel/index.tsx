import React from 'react';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';

import { Row, SpaceX } from 'src/components';
import { FFRIDSearch } from '../ffr-id-search';
import { PatientIDSearch } from '../patient-id-search';
import { UploadDatePicker } from '../upload-date-picker';
import { StatusBar } from '../status-bar';
import { PriorityBar } from '../priority-bar';

const Container = styled.div`
  width: 100%;
  height: 136px;
  background: #fff;
  margin-bottom: 24px;
  padding-left: 24px;
`;

const StyledRow = styled(Row)`
  height: 68px;
  align-items: center;
`;

const Title = styled.div`
  font-family: PingFangSC-Regular;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  letter-spacing: -0.08px;
  line-height: 22px;
  font-weight: 400;
`;

export const CaseFilterPanel = () => {
  return (
    <Container>
      <StyledRow>
        <Title>
          <FormattedMessage defaultMessage="任务属性：" />
        </Title>
        <SpaceX size={24} />
        <FFRIDSearch />
        <PatientIDSearch />
        <UploadDatePicker />
      </StyledRow>
      <StyledRow>
        <Title>
          <FormattedMessage defaultMessage="任务状态：" />
        </Title>
        <StatusBar />
        <SpaceX size={24} />
        <Title>
          <FormattedMessage defaultMessage="优先级：" />
        </Title>
        <PriorityBar />
      </StyledRow>
    </Container>
  );
};
