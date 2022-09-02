import React, { useCallback, useState } from 'react';
import { message } from 'antd';
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
    const [log, setLog] = useState<string>('');
    const dispatch = useDispatch();

    const onClick = useCallback(async () => {
      try {
        setIsModalVisible(true);
        dispatch(other.actions.toggleLoading(true));
        const algoOp = await getAlgoOperation(caseInfo.workflowID, caseInfo.step);

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
    }, [caseInfo.step, caseInfo.workflowID, dispatch]);

    const onClose = useCallback(async () => {
      setIsModalVisible(false);
    }, []);

    const onSave = useCallback(async () => {
      try {
        await saveToLocal(`${caseInfo.PatientID}_log.txt`, log);
      } catch (error) {
        message.error(`Download log error:${(error as Error).message}`);
      }
    }, [caseInfo.PatientID, log]);

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
