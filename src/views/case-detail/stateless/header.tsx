import React from 'react';
import styled from 'styled-components';
import { format, addDays } from 'date-fns';
import { FormattedMessage } from 'react-intl';

import { Row } from 'src/components';
import TagGroup from './case-tag-group';
import CasePriority from './case-priority';
import CaseStateLabel from './case-state';

export interface Props {
  caseInfo: CaseInfo;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 28px 50px 0px 40px;
`;

const Line = styled.div`
  width: 100%;
  border-left: 40px;
  border-right: 50px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
`;

const Title = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  height: 22px;
`;

const TitleHead = styled.div`
  display: flex;
  justify-content: flex-start;
  height: 22px;
`;

const TitleName = styled.div`
  height: 22px;
  line-height: 22px;
  font-size: 16px;
  color: rgba(0, 0, 0, 0.85);
  letter-spacing: -0.1px;
  line-height: 22px;
`;

const Tag = styled.div`
  height: 22px;
  border-radius: 2px;
  margin: 0 16px 0 16px;
  line-height: 20px;
`;

const TitleReport = styled.div`
  height: 22px;
  line-height: 22px;
  margin-right: 0px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
`;

const DeadlineAndPriority = styled(Row)`
  padding: 10px 0 23px 0;
  align-items: center;
`;

const Deadline = styled.div`
  font-family: PingFangSC-Regular;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  font-weight: 400;
  margin-right: 30px;
`;

const DeadlineText = styled.span`
  margin-right: 5px;
`;

// const Avatar = styled.div`
//   height: 24px;
//   margin-top: 24px;
//   margin-bottom: 8px;
// `;

// const FooterDate = styled.div`
//   height: 18px;
//   font-size: 12px;
//   color: rgba(0, 0, 0, 0.45);
//   line-height: 18px;
//   margin-bottom: 23.5px;
// `;

const Header: React.FC<Props> = ({ caseInfo }) => {
  return (
    <Container>
      <Title>
        <TitleHead>
          <TitleName>{caseInfo.PatientID}</TitleName>
          {caseInfo.tags && (
            <Tag>
              <TagGroup tags={caseInfo.tags} />
            </Tag>
          )}
        </TitleHead>
        <TitleReport>
          <CaseStateLabel state={caseInfo.progress} />
        </TitleReport>
      </Title>
      <DeadlineAndPriority>
        <Deadline>
          <DeadlineText>
            {format(addDays(new Date(caseInfo.uploadAt), 1), 'yyyy-MM-dd HH:mm:ss')}
          </DeadlineText>
          <FormattedMessage defaultMessage="截止" />
        </Deadline>
        <CasePriority priority={caseInfo.priority} />
      </DeadlineAndPriority>
      {/* <FooterDate>{format(caseInfo.deadline, 'yyyy-MM-dd HH:mm:ss')}</FooterDate>  */}
      <Line />
    </Container>
  );
};

export default Header;
