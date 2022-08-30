import React from 'react';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';
import { CopyOutlined } from '@ant-design/icons';
// import { CaseData } from 'src/redux/cases/types';
// import { Series } from 'src/types/casedoc';
// import { CasePermission, OperationPermission } from 'src/redux/user/types';
import { format } from 'date-fns';

export interface Props {
  caseInfo: CaseInfo;
  series: Series[];
}

const Container = styled.div`
  display: flex;
  justify-content: flex-start;
  width: 100%;
  padding: 23.5px 50px 23.5px 40px;
`;

const Line = styled.div`
  margin-left: 40px;
  margin-right: 50px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
`;

const Parse = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const Study = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const Title = styled.div`
  height: 22px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  line-height: 22px;
  margin-bottom: 4px;
`;

const Content = styled.div`
  display: flex;
  width: 286px;
`;

const ContentTitle = styled.div`
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 22px;
  margin-right: 6px;
  flex-shrink: 0;
`;

const ContentInfo = styled.div`
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 22px;
`;

const CopyButton = styled.div`
  svg {
    width: 12px;
    margin: 3px 0;
  }
  color: #1890ff;
  :hover {
    color: #91d5ff;
  }
  cursor: pointer;
`;

const copyStudyUID = (StudyInstanceUID: string) => {
  const aux = document.createElement('input');
  aux.setAttribute('value', StudyInstanceUID);
  document.body.appendChild(aux);
  aux.select();
  document.execCommand('copy');
  document.body.removeChild(aux);
};

const CaseInfo: React.FC<Props> = ({ caseInfo, series }) => {
  return (
    <>
      <Container>
        <Parse>
          <Title>Parse Information:</Title>
          <Content>
            <ContentTitle>
              <FormattedMessage defaultMessage="上传时间:" />
            </ContentTitle>
            <ContentInfo>{format(new Date(caseInfo.uploadAt), 'yyyy-MM-dd HH:mm:ss')}</ContentInfo>
          </Content>

          <Content>
            <ContentTitle>
              <FormattedMessage defaultMessage="返还时间:" />
            </ContentTitle>
            <ContentInfo>
              {caseInfo.returnEndAt &&
                format(new Date(caseInfo.returnEndAt), 'yyyy-MM-dd HH:mm:ss')}
            </ContentInfo>
          </Content>

          <Content>
            <ContentTitle>
              <FormattedMessage defaultMessage="截止时间:" />
            </ContentTitle>
            <ContentInfo>{format(new Date(caseInfo.uploadAt), 'yyyy-MM-dd HH:mm:ss')}</ContentInfo>
          </Content>
          <Content>
            <ContentTitle>
              <FormattedMessage defaultMessage="序列总数:" />
            </ContentTitle>
            <ContentInfo>{series.length}</ContentInfo>
          </Content>
          <Content>
            <ContentTitle>
              <FormattedMessage defaultMessage="总张数:" />
            </ContentTitle>
            <ContentInfo>
              {series.reduce((sum, item) => Number(item.tags.NumberOfSlices) + sum, 0)}
            </ContentInfo>
          </Content>

          <Content>
            <ContentTitle>
              <FormattedMessage defaultMessage="入组序列:" />
            </ContentTitle>
            <ContentInfo>
              {series
                .filter((d) => d.passed)
                .map((d) => d.tags.SeriesNumber)
                .join(', ')}
            </ContentInfo>
          </Content>
          <Content>
            <ContentTitle>
              <FormattedMessage defaultMessage="分析序列:" />
            </ContentTitle>
            <ContentInfo>{series.find((d) => d.selected)?.tags.SeriesNumber || ''}</ContentInfo>
          </Content>
        </Parse>
        <Study>
          <Title>Study Information:</Title>
          <Content>
            <ContentTitle>AccessionNumber:</ContentTitle>
            <ContentInfo>{caseInfo.AccessionNumber}</ContentInfo>
          </Content>
          <Content>
            <ContentTitle>PatientSex:</ContentTitle>
            <ContentInfo>{caseInfo.PatientSex}</ContentInfo>
          </Content>
          <Content>
            <ContentTitle>PatientAge:</ContentTitle>
            <ContentInfo>{caseInfo.PatientAge}</ContentInfo>
          </Content>
          <Content>
            <ContentTitle>StudyDate:</ContentTitle>
            <ContentInfo>{caseInfo.StudyDate}</ContentInfo>
          </Content>
          <Content>
            <ContentTitle>InstitutionName：:</ContentTitle>
            <ContentInfo>{caseInfo.InstitutionName}</ContentInfo>
          </Content>
          <Content>
            <ContentTitle>Description:</ContentTitle>
            <ContentInfo>{caseInfo.Description}</ContentInfo>
          </Content>
          <Content>
            <ContentTitle>StudyInstanceUID:</ContentTitle>
            <CopyButton onClick={() => copyStudyUID(caseInfo.StudyInstanceUID)}>
              <CopyOutlined />
            </CopyButton>
          </Content>
        </Study>
      </Container>
      <Line />
    </>
  );
};

export default CaseInfo;
