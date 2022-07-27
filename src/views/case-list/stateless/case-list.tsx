import React, { useMemo } from 'react';
import { Table } from 'antd';
import styled from 'styled-components';
import { FormattedMessage, useIntl, IntlFormatters } from 'react-intl';

import { OpenToolBtn } from 'src/views/open-tool-btn';

const createCaseColumns = (formatMessage: IntlFormatters['formatMessage']) => [
  {
    title: formatMessage({ defaultMessage: '姓名' }),
    dataIndex: ['attributes', 'dicomTag', 'PatientName'],
  },
  {
    title: '年龄',
    dataIndex: ['attributes', 'dicomTag', 'PatientAge'],
  },
  {
    title: 'WorkflowID',
    dataIndex: ['attributes', 'workflowID'],
  },
  {
    title: 'Tool',
    dataIndex: ['attributes', 'workflowID'],
    render: () => {
      return <OpenToolBtn toolName={'qc' as any} />;
    },
  },
];

const Container = styled.div`
  height: calc(100% - 200px);
`;

const Header = styled.div`
  height: 56px;
`;

interface Props {
  cases: CaseInfo[];
  pagination: Pagination;
}

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
        scroll={{ y: 'calc(100vh - 345px)' }}
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
