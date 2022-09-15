import React from 'react';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';

import { NodeStep } from 'src/type';

const Container = styled.div`
  font-family: PingFangSC-Regular;
  font-size: 14px;
  color: #ff4d4f;
  line-height: 22px;
  font-weight: 400;
`;

interface Props {
  step: NodeStep;
}

const getErrorHintByStep = (step: NodeStep) => {
  let hint: React.ReactElement;
  switch (step) {
    case NodeStep.DICOM_PARSE:
      hint = <FormattedMessage defaultMessage="解析失败，脚本处理" />;
      break;
    case NodeStep.DICOM2_NIFTI:
      hint = <FormattedMessage defaultMessage="转换失败，重新QC" />;
      break;
    case NodeStep.SEGMENT:
    case NodeStep.SEGMENT_EDIT:
    case NodeStep.REFINE:
      hint = <FormattedMessage defaultMessage="计算失败，脚本处理" />;
      break;
    case NodeStep.LUMEN_REFINEMENT_CL:
      hint = <FormattedMessage defaultMessage="提取cl失败，重新精分" />;
      break;
    case NodeStep.SZ_FFR:
      hint = <FormattedMessage defaultMessage="ffr计算失败，重新精分" />;
      break;
    case NodeStep.GEN_CPR_PLY:
      hint = <FormattedMessage defaultMessage="CPR展开失败，重新精分" />;
      break;
    default:
      hint = <FormattedMessage defaultMessage="计算失败" />;
      break;
  }
  return hint;
};

export const ErrorHint: React.FC<Props> = ({ step }) => {
  return <Container>{getErrorHintByStep(step)}</Container>;
};
