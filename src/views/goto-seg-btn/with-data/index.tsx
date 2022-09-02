import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { cases, microApp, other } from 'src/redux';
import { RootState, AppDispatch } from 'src/store';
import { getOperation } from 'src/api';
import { loadMicroAppByStep, delay } from 'src/utils';
import { NodeStep, ErrorType } from 'src/type';

interface Props {}

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Props> =>
  ({ ...props }) => {
    const dispatch = useDispatch<AppDispatch>();

    const microAppReady = useSelector(microApp.selectors.microAppReady);
    const visible = useSelector(microApp.selectors.canGotoSeg);
    const id = useSelector(cases.selectors.openCaseID);
    const caseInfo = useSelector((state: RootState) => cases.selectors.getCaseByID(state, id!));

    const onClick = useCallback(async () => {
      try {
        dispatch(microApp.actions.toggleGotoSegLoading(true));
        const { id, attributes } = await getOperation(caseInfo.workflowID, NodeStep.SEGMENT_EDIT);
        const operation = { id, ...attributes };
        dispatch(microApp.actions.toggleMicroAppVisible(false));

        const submit = async (
          output: ToolOutput,
          makeSubmitInput: (output: ToolOutput) => Promise<any>,
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
          }
        };
        await delay(40);
        dispatch(microApp.actions.toggleMicroAppVisible(true));
        loadMicroAppByStep(caseInfo, operation, submit);
      } catch (error) {
        console.error('Goto seg error', error);
      }
    }, [caseInfo, dispatch]);

    if (!visible) return null;

    return <WrappedComponent {...(props as P)} disabled={!microAppReady} onClick={onClick} />;
  };
