import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { message } from 'antd';

import { loadMicroAppByStatus, microAppMgr } from 'src/utils';
import { microApp } from 'src/redux';
import { AppDispatch } from 'src/store';
import { getOperation } from 'src/api';
import { CaseStatus, NodeStep } from 'src/type';

interface Props {
  caseInfo: CaseInfo;
}

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Props> =>
  ({ ...props }) => {
    const { caseInfo } = props;

    const dispatch = useDispatch<AppDispatch>();

    const onClick = useCallback(async () => {
      try {
        dispatch(microApp.actions.toggleMicroAppVisible(true));
        dispatch(microApp.actions.toggleCanSubmit(true));
        const canPatchSeg = caseInfo.status === CaseStatus.WAITING_RIFINE;
        dispatch(microApp.actions.toggleCanPatchSeg(canPatchSeg));

        const { id, attributes: operation } = await getOperation(caseInfo.editID!);

        const submit = async (
          output: ToolOutput,
          makeSubmitInput: (output: ToolOutput) => Promise<any>,
        ) => {
          try {
            if (microAppMgr.isPatchSeg) {
              const newOperation = { ...operation, step: NodeStep.SEGMENT_EDIT };
              await dispatch(
                microApp.actions.patch({ operation: newOperation, output, makeSubmitInput }),
              ).unwrap();
            } else {
              await dispatch(
                microApp.actions.submit({ operation, output, makeSubmitInput }),
              ).unwrap();
            }
          } catch (error) {
            message.error(`Submit error:${(error as Error).message}`);
          }
        };

        loadMicroAppByStatus(caseInfo, { id, ...operation }, submit);
      } catch (error) {
        message.error(`Load error: ${(error as Error).message}`);
      }
    }, [dispatch, caseInfo]);

    return <WrappedComponent {...(props as P)} disabled={!caseInfo.enableEdit} onClick={onClick} />;
  };
