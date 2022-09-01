import React, { useCallback, useMemo } from 'react';
import { Pagination as P, Select } from 'antd';
import styled from 'styled-components';
import { useIntl } from 'react-intl';

import { Row } from '../flex-box';

const { Option } = Select;

const Container = styled(Row)`
  align-items: center;
`;

interface PaginationType {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}

interface Props {
  pagination: PaginationType;
  onChange: (page: number, pageSize: number) => void;
}

export const Pagination: React.FC<Props> = ({ pagination, onChange }) => {
  const intl = useIntl();

  const handleChange = useCallback(
    (pageSize: number) => {
      onChange(0, pageSize);
    },
    [onChange],
  );

  const makePageSizeText = useCallback(
    (pageSize: number) => {
      return intl.formatMessage(
        {
          defaultMessage: '{pageSize}条/页',
        },
        { pageSize },
      );
    },
    [intl],
  );

  const options = useMemo(() => {
    return [10, 20, 50, 100].map((v) => ({ key: v, value: makePageSizeText(v) }));
  }, [makePageSizeText]);

  return (
    <Container>
      <Select value={pagination.pageSize} style={{ width: 100 }} onChange={handleChange}>
        {options.map(({ key, value }) => {
          return (
            <Option key={key} value={key}>
              {value}
            </Option>
          );
        })}
      </Select>

      <P {...pagination} current={pagination.page} onChange={onChange} simple />
    </Container>
  );
};
