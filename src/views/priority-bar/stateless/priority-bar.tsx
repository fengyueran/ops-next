import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';

import { Priority } from 'src/type';
import { FilterButtonSet } from '../../filter-button-set';

enum All {
  'ALL' = 'all',
}

const Status = { ...Priority, ...All };

interface Props {
  onClick: (data?: ListItem[]) => void;
}
export const PriorityBar: React.FC<Props> = ({ onClick }) => {
  const intl = useIntl();

  const statuslist = useMemo(() => {
    return [
      { status: Status.ALL, name: intl.formatMessage({ defaultMessage: '全部' }), isAll: true },
      { status: Status.High, name: intl.formatMessage({ defaultMessage: '高' }) },
      { status: Status.Medium, name: intl.formatMessage({ defaultMessage: '中' }) },
      { status: Status.Low, name: intl.formatMessage({ defaultMessage: '低' }) },
    ];
  }, [intl]);

  return <FilterButtonSet onClick={onClick} list={statuslist} />;
};
