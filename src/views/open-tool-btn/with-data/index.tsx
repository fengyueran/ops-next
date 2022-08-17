import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { message } from 'antd';

import { microAppMgr, MaskEditType } from 'src/utils';
import { microApp } from 'src/redux';
import { CaseStatus } from 'src/type';
import { completeNode, getOperation } from 'src/api';

import {
  makeQCSubmitInput,
  makeSegSubmitInput,
  makeRefineSubmitInput,
  makeReviewSubmitInput,
  makeReportSubmitInput,
  makeQCToolInput,
  makeMaskEditToolInput,
  makeReivewToolInput,
  makeReportToolInput,
} from './util';

interface Props {
  caseInfo: CaseInfo;
}

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Props> =>
  ({ ...props }) => {
    const { caseInfo } = props;

    const dispatch = useDispatch();

    const onClick = useCallback(async () => {
      try {
        const status: CaseStatus = caseInfo.status;
        dispatch(microApp.actions.toggleMicroAppVisible(true));
        const { attributes: operation } = await getOperation(caseInfo.workflowID, caseInfo.step);

        const submit = async (output: object, makeSubmitInput: (output: any) => Promise<any>) => {
          try {
            console.log('Submit', operation);
            const submitInput = await makeSubmitInput(output);
            await completeNode(operation.workflowID, operation.activityID, submitInput);
            dispatch(microApp.actions.toggleMicroAppVisible(false));
          } catch (error) {
            message.error(`Submit  error: ${(error as Error).message}`);
            dispatch(microApp.actions.toggleSubmitPending(false));
          }
        };

        switch (status) {
          case CaseStatus.WAITING_QC:
            microAppMgr.loadQCTool(
              makeQCToolInput(operation, (output) => submit(output, makeQCSubmitInput)),
            );
            break;
          case CaseStatus.WAITING_SEGMENT:
            microAppMgr.loadMaskEditTool(
              makeMaskEditToolInput(operation, MaskEditType.Segment, (output) =>
                submit(output, makeSegSubmitInput),
              ),
            );
            break;
          case CaseStatus.WAITING_RIFINE:
            microAppMgr.loadMaskEditTool(
              makeMaskEditToolInput(operation, MaskEditType.Refine, (output) =>
                submit(output, makeRefineSubmitInput),
              ),
            );
            break;
          case CaseStatus.WAITING_REVIEW:
            microAppMgr.loadReviewTool(
              makeReivewToolInput(operation, caseInfo, (output) =>
                submit(output, makeReviewSubmitInput),
              ),
            );
            break;
          case CaseStatus.WAITING_REPORT:
            microAppMgr.loadReportTool(
              makeReportToolInput(operation, caseInfo, (output) =>
                submit(output, makeReportSubmitInput),
              ),
            );
            break;
          default:
            throw new Error('There is no corresponding tool!');
        }
      } catch (error) {
        message.error(`Load error: ${(error as Error).message}`);
      }
    }, [dispatch, caseInfo]);

    return <WrappedComponent {...(props as P)} disabled={!caseInfo.enableEdit} onClick={onClick} />;
  };
