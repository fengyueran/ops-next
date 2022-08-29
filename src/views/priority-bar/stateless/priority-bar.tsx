import React, { useState, useMemo } from 'react';
import { useIntl } from 'react-intl';

import { TextBtnSet } from 'src/components';
import { Priority } from 'src/type';

enum All {
  'ALL' = 'all',
}

const Status = { ...Priority, ...All };

interface Props {
  onClick: (data: any) => void;
}
export const PriorityBar: React.FC<Props> = ({ onClick }) => {
  const intl = useIntl();

  const statuslist = useMemo(() => {
    return [
      { status: Status.ALL, name: intl.formatMessage({ defaultMessage: '全部' }) },
      { status: Status.High, name: intl.formatMessage({ defaultMessage: '高' }) },
      { status: Status.Medium, name: intl.formatMessage({ defaultMessage: '中' }) },
      { status: Status.Low, name: intl.formatMessage({ defaultMessage: '低' }) },
    ];
  }, [intl]);
  const textList = useMemo(() => {
    return statuslist.map(({ name }) => name);
  }, [statuslist]);

  const [selectedList, setSelectedList] = useState(textList);

  return <TextBtnSet onClick={onClick} list={statuslist} selectedList={selectedList} />;
};
