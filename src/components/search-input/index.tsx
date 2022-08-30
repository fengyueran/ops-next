import React, { useCallback, useRef } from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Input, AutoComplete } from 'antd';

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
  onSearch: (v?: string) => void;
}

export const SearchInput: React.FC<Props> = ({ name, onSearch }) => {
  const ref = useRef(null);
  const intl = useIntl();
  const placeholder = intl.formatMessage({ defaultMessage: '请输入' });

  const handlePressEnter = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      onSearch(e?.target.value);
      if (ref?.current) {
        (ref.current as HTMLInputElement).blur();
      }
    },
    [onSearch],
  );

  const onChange = useCallback(
    (v: string) => {
      if (!v) {
        onSearch();
      }
    },
    [onSearch],
  );

  return (
    <StyledRow>
      <Name>{name}</Name>
      <AutoComplete allowClear ref={ref} onChange={onChange}>
        <Input onPressEnter={handlePressEnter} placeholder={placeholder} />
      </AutoComplete>
    </StyledRow>
  );
};
