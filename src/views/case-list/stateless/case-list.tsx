import React, { useMemo } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd/es/table';
import styled from 'styled-components';
import { FormattedMessage, useIntl, IntlFormatters } from 'react-intl';
import { format, addDays } from 'date-fns';

import { ColorTag, Row, Pagination } from 'src/components';
import { OpenToolBtn } from 'src/views/open-tool-btn';
import { OpenDetailButton } from 'src/views/open-detail-btn';
import { StatusTag } from 'src/views/status-tag';
import { ErrorHint } from 'src/views/error-hint';
import { OpenLogBtn } from 'src/views/open-log-btn';
import { CaseStatus, Priority } from 'src/type';
import { TagList } from './tag-list';

const createCaseColumns = (formatMessage: IntlFormatters['formatMessage']) => [
  {
    title: 'PatientID',
    sorter: true,
    width: 108,
    field: 'PatientID',
    render: (caseInfo: CaseInfo) => {
      if (caseInfo.readed) return caseInfo.PatientID;
      return <ColorTag tip={caseInfo.PatientID || '-'} color="red" />;
    },
  },
  {
    width: 160,
    sorter: true,
    field: 'ffrAccessionNumber',
    title: formatMessage({ defaultMessage: 'CTFFR检查号' }),
    dataIndex: ['ffrAccessionNumber'],
  },
  {
    width: 120,
    sorter: true,
    field: 'PatientName',
    title: formatMessage({ defaultMessage: '患者姓名' }),
    dataIndex: ['PatientName'],
  },
  {
    width: 160,
    sorter: true,
    field: 'uploadAt',
    title: formatMessage({ defaultMessage: '上传时间' }),
    dataIndex: ['uploadAt'],
    render: (uploadAt: string) => {
      return format(new Date(uploadAt), 'yyyy-MM-dd HH:mm');
    },
  },
  {
    width: 160,
    sorter: true,
    field: 'uploadAt',
    title: formatMessage({ defaultMessage: '截止时间' }),
    dataIndex: ['uploadAt'],
    render: (uploadAt: string) => {
      return format(addDays(new Date(uploadAt), 1), 'yyyy-MM-dd HH:mm');
    },
  },
  {
    width: 160,
    sorter: true,
    field: 'returnEndAt',
    title: formatMessage({ defaultMessage: '返还时间' }),
    dataIndex: ['returnEndAt'],
    render: (returnEndAt: number) => {
      return '-';
    },
  },
  {
    width: 100,
    title: formatMessage({ defaultMessage: '优先级' }),
    dataIndex: ['priority'],
    render: (priority: Priority) => {
      let p;
      switch (priority) {
        case Priority.High:
          p = formatMessage({ defaultMessage: '高' });
          break;
        case Priority.Medium:
          p = formatMessage({ defaultMessage: '中' });
          break;
        default:
          p = formatMessage({ defaultMessage: '低' });
          break;
      }
      return p;
    },
  },
  {
    width: 140,
    title: formatMessage({ defaultMessage: '标签' }),
    dataIndex: ['tags'],
    render: (tags: string[]) => {
      if (!tags) return null;
      return <TagList tags={tags} />;
    },
  },
  {
    width: 100,
    title: formatMessage({ defaultMessage: '阴阳性' }),
    dataIndex: ['isPositive'],
    render: (isPositive: boolean) => {
      if (isPositive)
        return <ColorTag tip={formatMessage({ defaultMessage: '阳性' })} color="red" />;
      return <ColorTag tip={formatMessage({ defaultMessage: '阴性' })} color="green" />;
    },
  },
  {
    width: 100,
    title: formatMessage({ defaultMessage: '状态' }),
    dataIndex: ['progress'],
    render: (status: CaseStatus) => {
      return <StatusTag status={status} />;
    },
  },
  {
    width: 100,
    title: formatMessage({ defaultMessage: '操作' }),
    dataIndex: ['attributes'],
    render: (status: string) => {
      return '...';
    },
  },
  {
    width: 100,
    title: '',
    dataIndex: ['id'],
    render: (id: string) => {
      return <OpenDetailButton id={id} />;
    },
  },
  {
    width: 100,
    title: '',
    render: (caseInfo: CaseInfo & { id: string }) => {
      return <OpenToolBtn caseInfo={caseInfo} />;
    },
  },
  {
    width: 160,
    title: '',
    render: (caseInfo: CaseInfo) => {
      if (caseInfo.workflowFailed) {
        return <ErrorHint step={caseInfo.step} />;
      }
      return null;
    },
  },
  {
    width: 100,
    title: '',
    render: (caseInfo: CaseInfo) => {
      return <OpenLogBtn caseInfo={caseInfo} />;
    },
  },
];

const PaginationContainer = styled(Row)`
  width: 100%;
  background: #fff;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 56px;
`;

const Container = styled.div`
  position: relative;
  .ant-table-thead
    > tr
    > th:not(:last-child):not(.ant-table-selection-column):not(.ant-table-row-expand-icon-cell):not([colspan]):before {
    display: none;
  }
  .ant-table-tbody {
    color: rgba(0, 0, 0, 0.65);
  }
  .ant-table-column-title {
    flex: none;
  }
  .ant-table-column-sorters {
    justify-content: start;
  }
`;

const Header = styled.div``;

interface Props {
  cases?: CaseData[];
  pagination: Pagination;
  onChange: TableProps<any>['onChange'];
  onPageChange: (page: number, pageSize: number) => void;
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

export const CaseList: React.FC<Props> = ({ cases, pagination, onPageChange, onChange }) => {
  const intl = useIntl();

  const columns = useMemo(() => {
    return createCaseColumns(intl.formatMessage);
  }, [intl]);

  return (
    <Container>
      <PaginationContainer>
        <Header>
          <FormattedMessage
            defaultMessage="共{count}个任务"
            values={{ count: pagination?.total }}
          />
        </Header>
        {pagination && <Pagination pagination={pagination} onChange={onPageChange} />}
      </PaginationContainer>
      <Table
        onChange={onChange}
        dataSource={cases}
        columns={columns}
        rowKey="id"
        scroll={{ y: scrollY }}
        loading={!cases}
        pagination={false}
      />
    </Container>
  );
};
