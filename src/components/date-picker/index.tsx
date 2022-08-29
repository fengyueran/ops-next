import React from 'react';
import { DatePicker as DP } from 'antd';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  align-items: center;
  color: rgba(0, 0, 0, 0.65);
`;

const Label = styled.span`
  padding-right: 8px;
  font-size: 14px;
  white-space: nowrap;
`;

interface Props {
  name: string | React.ReactElement;
  dataRange?: any;
  onDateRange: (dataRange?: any) => void;
}

const { RangePicker } = DP;

export const DatePicker: React.FC<Props> = ({ name, dataRange, onDateRange }) => (
  <Container>
    <Label>{name}</Label>
    <RangePicker
      style={{ width: 268 }}
      // value={get(dataRange, 'data', null)}
      onChange={(d, ds) => onDateRange({ data: d, dataString: ds })}
    />
  </Container>
);
