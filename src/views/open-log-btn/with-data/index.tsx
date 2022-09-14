import React, { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';

import { other } from 'src/redux';
import { getAlgoOperation, getLog } from 'src/api';
import { saveToLocal } from 'src/utils';
import { ErrorType } from 'src/type';
interface Props {
  caseInfo: CaseInfo;
}

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Props> =>
  ({ ...props }) => {
    const { caseInfo } = props;
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [log, setLog] = useState<string | null>(null);
    const dispatch = useDispatch();

    const onClick = useCallback(async () => {
      try {
        setIsModalVisible(true);
        dispatch(other.actions.toggleLoading(true));
        const algoOp = await getAlgoOperation(caseInfo.workflowID);

        if (algoOp) {
          const logData = await getLog(caseInfo.workflowID, algoOp.id);
          setLog(logData);
        } else {
          setLog('');
        }
      } catch (error) {
        console.error('Load log error', error);
        dispatch(
          other.actions.setError({
            type: ErrorType.LoadLogError,
            detail: (error as Error).message,
          }),
        );
      } finally {
        dispatch(other.actions.toggleLoading(false));
      }
    }, [caseInfo.workflowID, dispatch]);

    const onClose = useCallback(async () => {
      setIsModalVisible(false);
      setLog(null);
    }, []);

    const onSave = useCallback(async () => {
      try {
        await saveToLocal(`${caseInfo.PatientID}_log.txt`, log!);
      } catch (error) {
        const errorMessage = (error as Error).message;
        const canceled = errorMessage.includes('aborted');
        if (!canceled) {
          dispatch(
            other.actions.setError({ type: ErrorType.DownloadLogError, detail: errorMessage }),
          );
        }
      }
    }, [caseInfo.PatientID, log, dispatch]);

    if (!caseInfo.workflowFailed) {
      return null;
    }

    return (
      <WrappedComponent
        {...(props as P)}
        onClick={onClick}
        visible={isModalVisible}
        log={log}
        onSave={onSave}
        onClose={onClose}
      />
    );
  };
