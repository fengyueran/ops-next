import React, { useMemo } from 'react';
import { Table } from 'antd';
import styled from 'styled-components';
import { FormattedMessage, useIntl, IntlFormatters } from 'react-intl';

import { ColorTag } from 'src/components';
import { OpenToolBtn } from 'src/views/open-tool-btn';
import { StatusTag } from 'src/views/status-tag';
import { NodeStep } from 'src/type';

const TagContainer = styled.div`
  display: flex;
`;

const Tag = styled.div`
  padding: 0px 9px;
  font-size: 12px;
  background: rgb(250, 250, 250);
  color: rgba(0, 0, 0, 0.85);
  border: 1px solid rgb(217, 217, 217);
  border-radius: 2px;
  margin-right: 8px;
`;

const createCaseColumns = (formatMessage: IntlFormatters['formatMessage']) => [
  {
    title: 'PatientID',
    dataIndex: ['attributes'],
    sorter: true,
    render: (caseInfo: CaseInfo) => {
      if (caseInfo.isReaded) return caseInfo.PatientID;
      return <ColorTag tip={caseInfo.PatientID || '-'} color="red" />;
    },
  },
  {
    title: formatMessage({ defaultMessage: 'CTFFR检查号' }),
    dataIndex: ['attributes', 'ffrAccessionNumber'],
  },
  {
    title: formatMessage({ defaultMessage: '患者姓名' }),
    dataIndex: ['attributes', 'PatientName'],
  },
  {
    title: formatMessage({ defaultMessage: '上传时间' }),
    dataIndex: ['attributes', 'uploadedAt'],
    sorter: true,
  },
  {
    title: formatMessage({ defaultMessage: '截止时间' }),
    dataIndex: ['attributes', 'uploadedAt'],
    sorter: true,
  },
  {
    title: formatMessage({ defaultMessage: '返还时间' }),
    dataIndex: ['attributes', 'resultReturnedAt'],
    sorter: true,
    render: (resultReturnedAt: number) => {
      return '-';
    },
  },
  {
    title: formatMessage({ defaultMessage: '优先级' }),
    dataIndex: ['attributes', 'priority'],
    render: (priority: number) => {
      return priority;
    },
  },
  {
    title: formatMessage({ defaultMessage: '标签' }),
    dataIndex: ['attributes', 'tags'],
    render: (tags: string[]) => {
      if (!tags) return null;
      return (
        <TagContainer>
          {tags.map((tagName) => (
            <Tag key={tagName}>{tagName}</Tag>
          ))}
        </TagContainer>
      );
    },
  },
  {
    title: formatMessage({ defaultMessage: '阴阳性' }),
    dataIndex: ['attributes', 'isPositive'],
    render: (isPositive: boolean) => {
      if (isPositive)
        return <ColorTag tip={formatMessage({ defaultMessage: '阳性' })} color="red" />;
      return <ColorTag tip={formatMessage({ defaultMessage: '阴性' })} color="green" />;
    },
  },
  {
    title: formatMessage({ defaultMessage: '状态' }),
    dataIndex: ['attributes', 'step'],
    render: (step: NodeStep) => {
      return <StatusTag step={step} />;
    },
  },
  {
    title: formatMessage({ defaultMessage: '操作' }),
    dataIndex: ['attributes'],
    render: (status: string) => {
      return '...';
    },
  },
  {
    title: '',
    dataIndex: ['attributes'],
    render: (caseInfo: CaseInfo) => {
      return <OpenToolBtn caseInfo={caseInfo} />;
    },
  },
  {
    title: '',
    dataIndex: ['attributes'],
    render: (caseInfo: CaseInfo) => {
      return 'error hint';
    },
  },
];

const Container = styled.div`
  .ant-table-thead
    > tr
    > th:not(:last-child):not(.ant-table-selection-column):not(.ant-table-row-expand-icon-cell):not([colspan]):before {
    display: none;
  }
  .ant-table-tbody {
    color: rgba(0, 0, 0, 0.65);
  }
  .ant-pagination {
    background: #fff;
    margin: 0;
    padding: 12px 0;
  }
`;

const Header = styled.div`
  position: absolute;
  left: 18px;
`;

interface Props {
  cases: CaseData[];
  pagination: Pagination;
}

const scrollY = (() => {
  const HEADER_HEIGHT = 64;
  const CASE_FILTER_HEIGHT = 136;
  const MARGIN_BETWEEN_TABLE_AND_CASE_FILTER = 24;
  const PAGINATION_HEIGHT = 56;
  const TABLE_HEADER_HEIGHT = 55;
  const BOTTOM_PADDING = 10;
  const total =
    HEADER_HEIGHT +
    CASE_FILTER_HEIGHT +
    MARGIN_BETWEEN_TABLE_AND_CASE_FILTER +
    PAGINATION_HEIGHT +
    TABLE_HEADER_HEIGHT +
    BOTTOM_PADDING;

  return `calc(100vh - ${total}px)`;
})();

export const CaseList: React.FC<Props> = ({ cases, pagination }) => {
  const { total } = pagination;
  const intl = useIntl();

  const columns = useMemo(() => {
    return createCaseColumns(intl.formatMessage);
  }, [intl]);

  return (
    <Container>
      <Table
        dataSource={cases}
        columns={columns}
        rowKey="id"
        scroll={{ y: scrollY }}
        pagination={{
          position: ['topRight'],
          showSizeChanger: true,
          showTotal: () => (
            <Header>
              <FormattedMessage defaultMessage="共{count}个任务" values={{ count: total }} />
            </Header>
          ),
        }}
      />
    </Container>
  );
};
