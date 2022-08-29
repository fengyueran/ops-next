import React, { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

import { TextBtnSet } from 'src/components';
import { CaseStatus } from 'src/type';

enum All {
  'ALL' = 'all',
}

const Status = { ...CaseStatus, ...All };

interface Props {
  onClick: (data: any) => void;
}
export const StatusBar: React.FC<Props> = ({ onClick }) => {
  const intl = useIntl();

  const statuslist = useMemo(() => {
    return [
      { status: Status.ALL, name: intl.formatMessage({ defaultMessage: '全部' }) },
      { status: Status.WAITING_QC, name: intl.formatMessage({ defaultMessage: '待质检' }) },
      { status: Status.WAITING_SEGMENT, name: intl.formatMessage({ defaultMessage: '待粗分' }) },
      { status: Status.WAITING_RIFINE, name: intl.formatMessage({ defaultMessage: '待精分' }) },
      { status: Status.WAITING_REVIEW, name: intl.formatMessage({ defaultMessage: '待审查' }) },
      { status: Status.WAITING_REPORT, name: intl.formatMessage({ defaultMessage: '待报告' }) },
      { status: Status.WAITING_RETURN, name: intl.formatMessage({ defaultMessage: '待返还' }) },
      { status: Status.RETURNED, name: intl.formatMessage({ defaultMessage: '已返还' }) },
    ];
  }, [intl]);

  const textList = useMemo(() => {
    return statuslist.map(({ name }) => name);
  }, [statuslist]);

  const [selectedList, setSelectedList] = useState(textList);

  return <TextBtnSet onClick={onClick} list={statuslist} selectedList={selectedList} />;
};
