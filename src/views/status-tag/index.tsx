import React from 'react';
import { FormattedMessage } from 'react-intl';

import { CaseProgress, StatusColorMap } from 'src/type';
import { ColorTag } from 'src/components';

const TagMap = {
  [CaseProgress.WAITING_QC]: {
    tag: <FormattedMessage defaultMessage="待质检" />,
    color: StatusColorMap[CaseProgress.WAITING_QC],
  },
  [CaseProgress.WAITING_SEGMENT]: {
    tag: <FormattedMessage defaultMessage="待粗分" />,
    color: StatusColorMap[CaseProgress.WAITING_SEGMENT],
  },
  [CaseProgress.WAITING_RIFINE]: {
    tag: <FormattedMessage defaultMessage="待精分" />,
    color: StatusColorMap[CaseProgress.WAITING_RIFINE],
  },
  [CaseProgress.WAITING_REVIEW]: {
    tag: <FormattedMessage defaultMessage="待审查" />,
    color: StatusColorMap[CaseProgress.WAITING_REVIEW],
  },
  [CaseProgress.WAITING_REPORT]: {
    tag: <FormattedMessage defaultMessage="待报告" />,
    color: StatusColorMap[CaseProgress.WAITING_REPORT],
  },
  [CaseProgress.WAITING_RETURN]: {
    tag: <FormattedMessage defaultMessage="待返还" />,
    color: StatusColorMap[CaseProgress.WAITING_RETURN],
  },
  [CaseProgress.RETURNED]: {
    tag: <FormattedMessage defaultMessage="已返还" />,
    color: StatusColorMap[CaseProgress.RETURNED],
  },
};

interface Props {
  status: CaseProgress;
}

export const StatusTag: React.FC<Props> = ({ status }) => {
  const tag = TagMap[status];
  if (!tag) {
    return null;
  }

  return <ColorTag color={tag.color} tip={tag.tag} />;
};
