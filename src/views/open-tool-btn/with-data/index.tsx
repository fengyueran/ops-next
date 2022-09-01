import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { message } from 'antd';

import { loadMicroAppByStatus } from 'src/utils';
import { microApp, cases } from 'src/redux';
import { AppDispatch } from 'src/store';
import { getOperationByID, tagCaseReaded } from 'src/api';
import { CaseStatus } from 'src/type';

interface Props {
  caseInfo: CaseInfo & { id: string };
}

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Props> =>
  ({ ...props }) => {
    const { caseInfo } = props;

    const dispatch = useDispatch<AppDispatch>();

    const onClick = useCallback(async () => {
      try {
        dispatch(cases.actions.setOpenCaseID(caseInfo.id));
        dispatch(microApp.actions.toggleMicroAppVisible(true));
        dispatch(microApp.actions.toggleCanSubmit(true));
        const canGotoSeg = caseInfo.progress === CaseStatus.WAITING_RIFINE;
        dispatch(microApp.actions.toggleCanGotoSeg(canGotoSeg));

        if (caseInfo.progress === CaseStatus.WAITING_QC && !caseInfo.readed) {
          await tagCaseReaded(caseInfo.id);
        }

        const { id, attributes: operation } = await getOperationByID(caseInfo.editID!);

        const submit = async (
          output: ToolOutput,
          makeSubmitInput: (output: ToolOutput) => Promise<any>,
        ) => {
          try {
            if (caseInfo.workflowFailed) {
              await dispatch(
                microApp.actions.patch({ operation, output, makeSubmitInput }),
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
