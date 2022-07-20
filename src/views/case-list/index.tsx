import React from 'react';
import { Table } from 'antd';

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

export const CaseList = () => {
  return <Table dataSource={dataSource} columns={columns} />;
};
