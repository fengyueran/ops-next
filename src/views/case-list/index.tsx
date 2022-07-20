import React from 'react';
import { Table } from 'antd';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';

const dataSource = [
  {
    key: '1',
    PatientName: '明兰',
    age: 18,
    tags: '门诊',
  },
  {
    key: '2',
    PatientName: '顾二叔',
    age: 32,
    tags: '免费',
  },
];

const columns = [
  {
    title: '姓名',
    dataIndex: 'PatientName',
    key: 'PatientName',
  },
  {
    title: '年龄',
    dataIndex: 'age',
    key: 'age',
  },
  {
    title: '标签',
    dataIndex: 'tags',
    key: 'tags',
  },
];

const Header = styled.div`
  height: 56px;
`;

export const CaseList = () => {
  return (
    <div>
      <Header>
        <FormattedMessage
          defaultMessage="共{count}个任务"
          values={{ count: 66 }}
        />
      </Header>
      <Table dataSource={dataSource} columns={columns} />
    </div>
  );
};
