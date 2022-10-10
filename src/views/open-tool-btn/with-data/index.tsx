import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { loadMicroAppByStatus } from 'src/utils';
import { microApp, cases, other } from 'src/redux';
import { AppDispatch } from 'src/store';
import { getOperationByID, tagCaseReaded } from 'src/api';
import { CaseProgress, ErrorType, NodeStep } from 'src/type';

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
        const canGotoSeg = caseInfo.progress === CaseProgress.WAITING_RIFINE;
        dispatch(microApp.actions.toggleCanGotoSeg(canGotoSeg));

        if (caseInfo.progress === CaseProgress.WAITING_QC && !caseInfo.readed) {
          await tagCaseReaded(caseInfo.id);
        }

        const { id, attributes: operation } = await getOperationByID(caseInfo.editID!);
        dispatch(microApp.actions.setCurrentOperation({ id, ...operation }));

        const submit = async (
          output: ToolOutput,
          makeSubmitInput: (output: ToolOutput, operation: OperationDataAttributes) => Promise<any>,
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
            console.error('Submit error', error);
            dispatch(microApp.actions.toggleSubmitPending(false));
            dispatch(
              other.actions.setError({
                type: ErrorType.SubmitError,
                detail: (error as Error).message,
              }),
            );
          }
        };

        loadMicroAppByStatus(caseInfo, { id, ...operation }, submit);
      } catch (error) {
        console.error('Open tool error', error);
        dispatch(
          other.actions.setError({
            type: ErrorType.OpenToolError,
            detail: (error as Error).message,
          }),
        );
      }
    }, [dispatch, caseInfo]);

    const loading = useMemo(() => {
      const editingStep = [
        NodeStep.QC,
        NodeStep.SEGMENT_EDIT,
        NodeStep.REFINE_EDIT,
        NodeStep.VALIDATE_FFR,
        NodeStep.REPORT,
      ];
      return !editingStep.includes(caseInfo.step) && caseInfo.step !== NodeStep.RETURNED;
    }, [caseInfo.step]);

    return (
      <WrappedComponent
        {...(props as P)}
        disabled={!caseInfo.enableEdit}
        loading={loading}
        onClick={onClick}
      />
    );
  };
