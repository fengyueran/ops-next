import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { cases, microApp, other, user } from 'src/redux';
import { RootState, AppDispatch } from 'src/store';
import { getOperation } from 'src/api';
import { loadMicroAppByStep, delay } from 'src/utils';
import { NodeStep, ErrorType } from 'src/type';

interface Props {}

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Props> =>
  ({ ...props }) => {
    const dispatch = useDispatch<AppDispatch>();
    const language = useSelector(user.selectors.user)?.language;
    const microAppReady = useSelector(microApp.selectors.microAppReady);
    const visible = useSelector(microApp.selectors.canGotoSeg);
    const id = useSelector(cases.selectors.openCaseID);
    const caseInfo = useSelector((state: RootState) => cases.selectors.getCaseByID(state, id!));
    // const currentOperation = useSelector(microApp.selectors.currentOperation);

    const onClick = useCallback(async () => {
      try {
        dispatch(microApp.actions.toggleGotoSegLoading(true));
        const { id, attributes } = await getOperation(caseInfo.workflowID, NodeStep.SEGMENT_EDIT);
        const operation = { id, ...attributes };
        // if (currentOperation?.output) {//disable refine output
        //   const segOutput = operation.output || {};
        //   operation.output = { ...segOutput, ...currentOperation.output };
        // }
        dispatch(microApp.actions.toggleMicroAppVisible(false));

        const submit = async (
          output: ToolOutput,
          makeSubmitInput: (output: ToolOutput, operation: OperationDataAttributes) => Promise<any>,
        ) => {
          try {
            await dispatch(microApp.actions.patch({ operation, output, makeSubmitInput })).unwrap();
          } catch (error) {
            dispatch(microApp.actions.toggleSubmitPending(false));
            dispatch(
              other.actions.setError({
                type: ErrorType.PatchError,
                detail: (error as Error).message,
              }),
            );
            return error;
          }
        };
        await delay(40);
        dispatch(cases.actions.setOpenCaseID(caseInfo.id));
        dispatch(microApp.actions.toggleMicroAppVisible(true));
        loadMicroAppByStep(caseInfo, operation, submit, false, language);
      } catch (error) {
        console.error('Goto seg error', error);
      }
    }, [caseInfo, dispatch, language]);

    if (!visible) return null;

    return <WrappedComponent {...(props as P)} disabled={!microAppReady} onClick={onClick} />;
  };
