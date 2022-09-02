import React from 'react';
import { FormattedMessage } from 'react-intl';

import { CaseStatus, StatusColorMap } from 'src/type';
import { ColorTag } from 'src/components';

const TagMap = {
  [CaseStatus.WAITING_QC]: {
    tag: <FormattedMessage defaultMessage="待质检" />,
    color: StatusColorMap[CaseStatus.WAITING_QC],
  },
  [CaseStatus.WAITING_SEGMENT]: {
    tag: <FormattedMessage defaultMessage="待粗分" />,
    color: StatusColorMap[CaseStatus.WAITING_SEGMENT],
  },
  [CaseStatus.WAITING_RIFINE]: {
    tag: <FormattedMessage defaultMessage="待精分" />,
    color: StatusColorMap[CaseStatus.WAITING_RIFINE],
  },
  [CaseStatus.WAITING_REVIEW]: {
    tag: <FormattedMessage defaultMessage="待审查" />,
    color: StatusColorMap[CaseStatus.WAITING_REVIEW],
  },
  [CaseStatus.WAITING_REPORT]: {
    tag: <FormattedMessage defaultMessage="待报告" />,
    color: StatusColorMap[CaseStatus.WAITING_REPORT],
  },
  [CaseStatus.WAITING_RETURN]: {
    tag: <FormattedMessage defaultMessage="待返还" />,
    color: StatusColorMap[CaseStatus.WAITING_RETURN],
  },
  [CaseStatus.RETURNED]: {
    tag: <FormattedMessage defaultMessage="已返还" />,
    color: StatusColorMap[CaseStatus.RETURNED],
  },
};

interface Props {
  status: CaseStatus;
}

export const StatusTag: React.FC<Props> = ({ status }) => {
  const tag = TagMap[status];
  if (!tag) {
    return null;
  }

  return <ColorTag color={tag.color} tip={tag.tag} />;
};
