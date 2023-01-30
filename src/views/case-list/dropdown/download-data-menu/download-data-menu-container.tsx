import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';

import { other } from 'src/redux';
import { NodeStep, ErrorType } from 'src/type';
import { downloadCaseData } from 'src/utils';

import DownloadDataMenu from './download-data-menu';

interface Props {
  caseInfo: CaseInfo;
}

const DownloadDataMenuContainer: React.FC<Props> = (props) => {
  const intl = useIntl();
  const { caseInfo } = props;
  const { workflowID, step, PatientID } = caseInfo;
  const dispatch = useDispatch();

  const disabled = step !== NodeStep.REPORT && step !== NodeStep.RETURNED;
  const onClick = useCallback(async () => {
    try {
      dispatch(
        other.actions.toggleLoading({
          visible: true,
          tip: intl.formatMessage({ defaultMessage: '下载中...' }),
        }),
      );
      await downloadCaseData(workflowID, PatientID);
    } catch (error) {
      dispatch(
        other.actions.setError({
          type: ErrorType.DownloadResultError,
          detail: (error as Error).message,
        }),
      );
    } finally {
      dispatch(other.actions.toggleLoading({ visible: false }));
    }
  }, [dispatch, intl, workflowID, PatientID]);

  return <DownloadDataMenu disabled={disabled} onClick={onClick} />;
};

export default DownloadDataMenuContainer;
