import React from 'react';
import styled from 'styled-components';
import { Badge } from 'antd';
import { FormattedMessage } from 'react-intl';

import { CaseStatus, StatusColorMap } from 'src/type';

export const caseStatusText: Record<CaseStatus, React.ReactElement> = {
  [CaseStatus.WAITING_QC]: <FormattedMessage defaultMessage="待质检" />,
  [CaseStatus.WAITING_SEGMENT]: <FormattedMessage defaultMessage="待粗分" />,
  [CaseStatus.WAITING_RIFINE]: <FormattedMessage defaultMessage="待精分" />,
  [CaseStatus.WAITING_REVIEW]: <FormattedMessage defaultMessage="待审查" />,
  [CaseStatus.WAITING_REPORT]: <FormattedMessage defaultMessage="待报告" />,
  [CaseStatus.WAITING_RETURN]: <FormattedMessage defaultMessage="待返还" />,
  [CaseStatus.COMPLETED]: <FormattedMessage defaultMessage="已返回" />,
};

export const getCaseStatusText = (state: CaseStatus): React.ReactElement => {
  return caseStatusText[state];
};

export interface Props {
  state: CaseStatus;
}

const Container = styled.div<{ color: string }>`
  height: 22px;
  padding: 0 7px;
  border: 1px solid ${(p) => p.color};
  border-radius: 11px;
  display: flex;
  align-items: center;
`;

/** Case状态标记 */
const CaseStateLabel: React.FC<Props> = ({ state }) => {
  return (
    <Container color={StatusColorMap[state]}>
      <Badge color={StatusColorMap[state]} text={getCaseStatusText(state)} />
    </Container>
  );
};

export default CaseStateLabel;
