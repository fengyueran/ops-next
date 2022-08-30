import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';

import { CaseStatus } from 'src/type';
import { FilterButtonSet } from '../../filter-button-set';

enum All {
  'ALL' = 'all',
}

const Status = { ...CaseStatus, ...All };

interface Props {
  onClick: (data?: ListItem[]) => void;
}
export const StatusBar: React.FC<Props> = ({ onClick }) => {
  const intl = useIntl();

  const statuslist = useMemo(() => {
    return [
      { status: Status.ALL, name: intl.formatMessage({ defaultMessage: '全部' }), isAll: true },
      { status: Status.WAITING_QC, name: intl.formatMessage({ defaultMessage: '待质检' }) },
      { status: Status.WAITING_SEGMENT, name: intl.formatMessage({ defaultMessage: '待粗分' }) },
      { status: Status.WAITING_RIFINE, name: intl.formatMessage({ defaultMessage: '待精分' }) },
      { status: Status.WAITING_REVIEW, name: intl.formatMessage({ defaultMessage: '待审查' }) },
      { status: Status.WAITING_REPORT, name: intl.formatMessage({ defaultMessage: '待报告' }) },
      { status: Status.WAITING_RETURN, name: intl.formatMessage({ defaultMessage: '待返还' }) },
      { status: Status.RETURNED, name: intl.formatMessage({ defaultMessage: '已返还' }) },
    ];
  }, [intl]);

  return <FilterButtonSet onClick={onClick} list={statuslist} />;
};
