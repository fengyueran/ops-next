import React, { useCallback, useState } from 'react';
import { message } from 'antd';
import { useDispatch } from 'react-redux';

import { other } from 'src/redux';
import { getAlgoOperation, geLog } from 'src/api';
import { saveToLocal } from 'src/utils';

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
        const data = await getAlgoOperation(caseInfo.workflowID, caseInfo.step);
        if (data) {
          const data = await geLog(caseInfo.workflowID, caseInfo.step);
          console.log('log', data);
        } else {
          setLog('');
        }
      } catch (error) {
        message.error(`Load log error:${(error as Error).message}`);
      } finally {
        dispatch(other.actions.toggleLoading(false));
      }
    }, [caseInfo.step, caseInfo.workflowID, dispatch]);

    const onClose = useCallback(async () => {
      setIsModalVisible(false);
    }, []);

    const onSave = useCallback(async () => {
      try {
        await saveToLocal(log);
      } catch (error) {
        message.error(`Download log error:${(error as Error).message}`);
      }
    }, [log]);

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
