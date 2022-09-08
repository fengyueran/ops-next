import React from 'react';
import { Collapse, Button } from 'antd';
import styled from 'styled-components';
import { UpOutlined } from '@ant-design/icons';
import { FormattedMessage } from 'react-intl';
import { format } from 'date-fns';

import { NodeStep } from 'src/type';
import qcfImage from 'src/assets/images/qcf.png';
import reportImage from 'src/assets/images/report.png';
import SeriesInfo from './series-info';
import TaskState from './case-task-state';

const { Panel } = Collapse;
export interface Props {
  series: Series[];
  operations: DetailOperation[];
  onOperationClick: (operation: DetailOperation) => void;
  patchNode: (operation: DetailOperation) => void;
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding-left: 40px;
  padding-right: 24px;
`;

const ScrollContainer = styled.div`
  height: 100%;
  overflow-y: auto;
  ::-webkit-scrollbar {
    width: 4px;
    height: 100%;
    margin-bottom: 24px;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 2px;
  }
  ::-webkit-scrollbar-thumb {
    width: 4px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 2px;
  }
`;

const Information = styled.div`
  display: flex;
  justify-content: space-between;
  padding-top: 18px;
  padding-bottom: 18px;
  margin-right: 22px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
`;

const ResultContent = styled.div`
  display: flex;
  margin-right: 26px;
`;

const StyledCollapse = styled(Collapse)`
  margin-right: 22px;
  .ant-collapse-item {
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    .ant-collapse-header {
      padding: 18px 0px 18px 0px;
    }
    .ant-collapse-content-box {
      padding: 0 !important;
    }
  }
`;

const OperationState = styled.div`
  right: 0 !important;
  top: 22px !important;
  padding: 0 !important;
  color: #1890ff !important;
`;
const OperationText = styled.span`
  font-size: 14px;
  margin-right: 4px;
`;

const Thumbnail = styled.img`
  width: 100px;
  height: 100px;
  margin-right: 16px;
  cursor: pointer;
`;

const ThumbnailHolder = styled.div`
  width: 100px;
  height: 100px;
  margin-right: 16px;
  border: 1px solid rgba(0, 0, 0, 0.45);
  cursor: pointer;
`;

const ResultState = styled.div`
  width: 48px;
  height: 20px;
  border-radius: 2px;
`;

const ResultCenter = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;
const ResultInfo = styled.div``;
const ResultRight = styled.div`
  display: flex;
`;

const OperationTitle = styled.div`
  height: 22px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  line-height: 22px;
`;

const ResultListDate = styled.div`
  height: 20px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 20px;
`;

const OperatorName = styled.div`
  height: 22px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 22px;
`;

const expandIcon = ({ isActive }: { isActive?: boolean }) => {
  return isActive ? (
    <OperationState>
      <OperationText>收起</OperationText>
      <UpOutlined />
    </OperationState>
  ) : (
    <OperationState>
      <OperationText>展开</OperationText>
      <UpOutlined rotate={180} />
    </OperationState>
  );
};

const Operations: React.FC<Props> = ({ operations, series, onOperationClick, patchNode }) => {
  const passedSeries = series.filter((s) => s.passed);
  const failedSeries = series.filter((s) => !s.passed);

  const passTotalTitle = `入组序列 ${passedSeries.length}`;
  const failTotalTitle = `未入组序列 ${failedSeries.length}`;

  return (
    <Container>
      <ScrollContainer>
        {operations.map((o, index, arr) => {
          let thumbnail = '';
          if (o.step === NodeStep.QC && !o.passed) {
            thumbnail = qcfImage;
          } else if (o.step === NodeStep.REPORT) {
            thumbnail = reportImage;
          } else if (o.thumbnail) {
            thumbnail = o.thumbnail;
          }
          const title = `${o.step} ${
            arr.slice(index + 1).filter((d) => d.step === o.step).length + 1
          }`;
          return (
            <Information key={o.id}>
              <ResultContent>
                {thumbnail ? (
                  <Thumbnail onClick={() => onOperationClick(o)} src={thumbnail} />
                ) : (
                  <ThumbnailHolder onClick={() => onOperationClick(o)} />
                )}
                <ResultCenter>
                  <ResultInfo>
                    <OperationTitle>{title}</OperationTitle>
                    <OperatorName>{o.operatorInfo?.email}</OperatorName>
                  </ResultInfo>
                  <ResultListDate>
                    {o.operatorInfo?.createdAt &&
                      format(new Date(o.operatorInfo?.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                  </ResultListDate>
                </ResultCenter>
              </ResultContent>
              <ResultRight>
                {o.step === NodeStep.QC && (
                  <Button size="small" style={{ marginRight: 10 }} onClick={() => patchNode(o)}>
                    <FormattedMessage defaultMessage="重新QC" />
                  </Button>
                )}
                {o.step === NodeStep.REFINE_EDIT && (
                  <Button size="small" style={{ marginRight: 10 }} onClick={() => patchNode(o)}>
                    <FormattedMessage defaultMessage="重新精分" />
                  </Button>
                )}
                {o.step === NodeStep.QC && (
                  <ResultState>
                    <TaskState passed={!!o.passed} />
                  </ResultState>
                )}
              </ResultRight>
            </Information>
          );
        })}

        <StyledCollapse bordered={false} expandIconPosition="start" expandIcon={expandIcon} ghost>
          <Panel header={passTotalTitle} key="1">
            {passedSeries.map((s, index) => (
              <Information key={s.UID}>
                <SeriesInfo
                  series={s}
                  title={`入组序列 ${index + 1}/${passedSeries.length}: Series #${
                    s.tags.SeriesNumber
                  }`}
                />
              </Information>
            ))}
          </Panel>
          <Panel header={failTotalTitle} key="2">
            {failedSeries.map((s, index) => (
              <Information key={s.UID}>
                <SeriesInfo
                  series={s}
                  title={`未入组序列 ${index + 1}/${failedSeries.length}: Series #${
                    s.tags.SeriesNumber
                  }`}
                />
              </Information>
            ))}
          </Panel>
        </StyledCollapse>
      </ScrollContainer>
    </Container>
  );
};
export default Operations;
