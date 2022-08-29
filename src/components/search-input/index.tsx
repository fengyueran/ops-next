import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Input, AutoComplete } from 'antd';
// import { SearchOutlined } from '@ant-design/icons';

import { Row } from '../flex-box';

const StyledRow = styled(Row)`
  align-items: center;
  margin-right: 24px;
`;

const Name = styled.div`
  opacity: 0.85;
  font-family: PingFangSC-Regular;
  font-size: 14px;
  color: #000000;
  text-align: right;
  line-height: 22px;
  font-weight: 400;
  margin-right: 8px;
`;

interface Props {
  name: string | React.ReactElement;
}

export const SearchInput: React.FC<Props> = ({ name }) => {
  const intl = useIntl();
  const placeholder = intl.formatMessage({ defaultMessage: '请输入' });
  return (
    <StyledRow>
      <Name>{name}</Name>
      <AutoComplete
        allowClear
        // ref={ref}
        // options={options}
        // onChange={setSearch}
        // defaultValue={search}
        // getPopupContainer={() => document.getElementById('search')}
      >
        <Input
          // prefix={icon}
          // onPressEnter={() => ref.current.blur()}
          placeholder={placeholder}
          // onChange={(e) => setSearch(e.target.value)}
        />
      </AutoComplete>
    </StyledRow>
  );
};
