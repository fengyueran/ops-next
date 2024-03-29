import React, { useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { Spin } from 'antd';
import { useSelector, useDispatch } from 'react-redux';

import { cases, caseDetail, microApp, other, user } from 'src/redux';
import { useOperationsAndSeries } from 'src/hooks';
import { loadMicroAppByStep } from 'src/utils';
import { RootState, AppDispatch } from 'src/store';
import { NodeStep, ErrorType } from 'src/type';

const LoadingWrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const withData =
  <P extends object>(
    WrappedComponent: React.ComponentType<P>,
  ): React.FC<Omit<P, 'caseInfo' | 'series' | 'operations' | 'onOperationClick' | 'patchNode'>> =>
  ({ ...props }) => {
    const dispatch = useDispatch<AppDispatch>();
    const id = useSelector(cases.selectors.openCaseID);
    const caseInfo = useSelector((state: RootState) => cases.selectors.getCaseByID(state, id!));
    const language = useSelector(user.selectors.user)?.language;

    const { data, error } = useOperationsAndSeries(caseInfo?.workflowID);

    const readyToOpenMicroApp = useCallback(() => {
      dispatch(microApp.actions.toggleMicroAppVisible(true));
      dispatch(caseDetail.actions.toggleLoading(false));
    }, [dispatch]);

    const onOperationClick = useCallback(
      (operation: DetailOperation) => {
        if (operation.step === NodeStep.VALIDATE_FFR) return;
        readyToOpenMicroApp();
        dispatch(microApp.actions.toggleCanSubmit(false));
        loadMicroAppByStep(caseInfo, operation, undefined, true, language);
      },
      [caseInfo, dispatch, readyToOpenMicroApp, language],
    );

    const patchNode = useCallback(
      (operation: DetailOperation) => {
        //重新精分
        if (operation.step === NodeStep.REFINE_EDIT) {
          dispatch(microApp.actions.toggleCanGotoSeg(true));
          dispatch(cases.actions.setOpenCaseID(caseInfo.id));
          dispatch(microApp.actions.setCurrentOperation(operation));
        }
        readyToOpenMicroApp();
        dispatch(microApp.actions.toggleCanSubmit(true));
        const submit = async (
          output: ToolOutput,
          makeSubmitInput: (output: ToolOutput, operation: OperationDataAttributes) => Promise<any>,
        ) => {
          try {
            await dispatch(microApp.actions.patch({ operation, output, makeSubmitInput })).unwrap();
          } catch (error) {
            console.error('Patch error', error);
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
        loadMicroAppByStep(caseInfo, operation, submit, false, language);
      },
      [caseInfo, dispatch, readyToOpenMicroApp, language],
    );

    useEffect(() => {
      if (error) {
        console.error('Get operaions error', error);
        dispatch(
          other.actions.setError({ type: ErrorType.LoadOperationError, detail: error.message }),
        );
      }
    }, [dispatch, error]);

    if (!caseInfo) return null;

    if (!data?.operations) {
      return (
        <LoadingWrapper>
          <Spin size="large" />
        </LoadingWrapper>
      );
    }

    return (
      <WrappedComponent
        {...(props as P)}
        caseInfo={caseInfo}
        series={data.series}
        operations={data.operations}
        patchNode={patchNode}
        onOperationClick={onOperationClick}
      />
    );
  };
