import React from 'react';
import { FormattedMessage } from 'react-intl';

import { CaseStatus } from 'src/type';
import { ColorTag } from 'src/components';

const TagMap = {
  [CaseStatus.WAITING_QC]: {
    tag: <FormattedMessage defaultMessage="待质检" />,
    color: '#B7B7B7',
  },
  [CaseStatus.WAITING_SEGMENT]: {
    tag: <FormattedMessage defaultMessage="待粗分" />,
    color: '#3E9FF9',
  },
  [CaseStatus.WAITING_RIFINE]: {
    tag: <FormattedMessage defaultMessage="待精分" />,
    color: '#F97043',
  },
  [CaseStatus.WAITING_REVIEW]: {
    tag: <FormattedMessage defaultMessage="待审查" />,
    color: '#5631F6',
  },
  [CaseStatus.WAITING_REPORT]: {
    tag: <FormattedMessage defaultMessage="待报告" />,
    color: '#1D71D1',
  },
  [CaseStatus.WAITING_RETURN]: {
    tag: <FormattedMessage defaultMessage="待返还" />,
    color: '#FDBE4A',
  },
  [CaseStatus.RETURNED]: {
    tag: <FormattedMessage defaultMessage="已返还" />,
    color: '#4FBB34',
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
