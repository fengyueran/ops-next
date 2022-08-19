import React from 'react';
import styled from 'styled-components';

import Header from './header';
import CaseInfo from './case-info';
import Operations from './operations';

export interface Props {
  caseInfo: CaseInfo;
  series: Series[];
  operations: DetailOperation[];
  onOperationClick: (operation: DetailOperation) => void;
  // onPatchClick: (id: string) => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #ffffff;
`;

export const CaseDetail: React.FC<Props> = ({ caseInfo, series, operations, onOperationClick }) => {
  return (
    <Container>
      <Header caseInfo={caseInfo} />
      <CaseInfo series={series} caseInfo={caseInfo} />
      <Operations series={series} operations={operations} onOperationClick={onOperationClick} />
    </Container>
  );
};
