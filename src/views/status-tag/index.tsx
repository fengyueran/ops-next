import React from 'react';
import { FormattedMessage } from 'react-intl';

import { NodeStep, CaseEditStep } from 'src/type';
import { ColorTag } from 'src/components';

const TagMap = {
  [CaseEditStep.WAITING_QC]: {
    tag: <FormattedMessage defaultMessage="待质检" />,
    color: '#B7B7B7',
  },
  [CaseEditStep.WAITING_SEGMENT]: {
    tag: <FormattedMessage defaultMessage="待粗分" />,
    color: '#3E9FF9',
  },
  [CaseEditStep.WAITING_RIFINE]: {
    tag: <FormattedMessage defaultMessage="待精分" />,
    color: '#F97043',
  },
  [CaseEditStep.WAITING_REVIEW]: {
    tag: <FormattedMessage defaultMessage="待审查" />,
    color: '#5631F6',
  },
  [CaseEditStep.WAITING_REPORT]: {
    tag: <FormattedMessage defaultMessage="待报告" />,
    color: '#1D71D1',
  },
  [CaseEditStep.WAITING_RETURN]: {
    tag: <FormattedMessage defaultMessage="待返还" />,
    color: '#FDBE4A',
  },
  [CaseEditStep.RETURNED]: {
    tag: <FormattedMessage defaultMessage="已返还" />,
    color: '#4FBB34',
  },
};

const getStatusByStep = (step: string) => {
  const statusMap = {
    [NodeStep.DICOM_PARSE]: CaseEditStep.WAITING_QC,
    [NodeStep.QC]: CaseEditStep.WAITING_QC,

    [NodeStep.DICOM2_NIFTI]: CaseEditStep.WAITING_SEGMENT,
    [NodeStep.SEGMENT]: CaseEditStep.WAITING_SEGMENT,
    [NodeStep.SEGMENT_EDIT]: CaseEditStep.WAITING_SEGMENT,

    [NodeStep.REFINE]: CaseEditStep.WAITING_RIFINE,
    [NodeStep.REFINE_EDIT]: CaseEditStep.WAITING_RIFINE,

    [NodeStep.LUMEN_REFINEMENT_CL]: CaseEditStep.WAITING_REVIEW,
    [NodeStep.SZ_FFR]: CaseEditStep.WAITING_REVIEW,
    [NodeStep.CARS_GEN_THUMBNAIL]: CaseEditStep.WAITING_REVIEW,
    [NodeStep.VALIDATE_FFR]: CaseEditStep.WAITING_REVIEW,

    [NodeStep.GEN_CPR_PLY]: CaseEditStep.WAITING_REPORT,
    [NodeStep.REPORT]: CaseEditStep.WAITING_REPORT,

    // [NodeStep.REPORT]: CaseEditStep.WAITING_RETURN,

    [NodeStep.RETURNED]: CaseEditStep.RETURNED,
  };

  return statusMap[step as keyof typeof statusMap];
};

interface Props {
  step: NodeStep;
}
export const StatusTag: React.FC<Props> = ({ step }) => {
  const tag = TagMap[getStatusByStep(step)];
  if (!tag) {
    console.error(`The step is wrong:${step}`);
    return null;
  }

  return <ColorTag color={tag.color} tip={tag.tag} />;
};
