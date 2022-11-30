import React from 'react';
import styled from 'styled-components';

import { getThumbnailPath } from 'src/api';
import Header from './header';
import CaseInfo from './case-info';
import Operations from './operations';

export interface Props {
  caseInfo: CaseInfo;
  series: Series[];
  operations: DetailOperation[];
  onOperationClick: (operation: DetailOperation) => void;
  patchNode: (operation: DetailOperation) => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #ffffff;
`;

export const CaseDetail: React.FC<Props> = ({
  caseInfo,
  series,
  operations,
  onOperationClick,
  patchNode,
}) => {
  return (
    <Container>
      <Header caseInfo={caseInfo} />
      <CaseInfo series={series} caseInfo={caseInfo} />
      <Operations
        series={series}
        caseInfo={caseInfo}
        operations={operations}
        onOperationClick={onOperationClick}
        patchNode={patchNode}
        ffrModelThumbnail={caseInfo.thumbnail && getThumbnailPath(caseInfo.thumbnail)}
      />
    </Container>
  );
};
