import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Spin, message } from 'antd';
import { useSelector, useDispatch } from 'react-redux';

import { cases, caseDetail, microApp } from 'src/redux';
import { useOperationsAndSeries } from 'src/hooks';
import { loadMicroAppByStep } from 'src/utils';
import { RootState, AppDispatch } from 'src/store';
import { NodeStep } from 'src/type';

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
    const id = useSelector(caseDetail.selectors.selectedCaseID);
    const caseInfo = useSelector((state: RootState) => cases.selectors.getCaseByID(state, id!));

    const { data, error } = useOperationsAndSeries(id && caseInfo?.workflowID);

    const readyToOpenMicroApp = useCallback(() => {
      dispatch(microApp.actions.toggleMicroAppVisible(true));
      dispatch(caseDetail.actions.setSelectCaseID());
    }, [dispatch]);

    const onOperationClick = useCallback(
      (operation: DetailOperation) => {
        readyToOpenMicroApp();
        dispatch(microApp.actions.toggleCanSubmit(false));
        loadMicroAppByStep(caseInfo, operation);
      },
      [caseInfo, dispatch, readyToOpenMicroApp],
    );

    const patchNode = useCallback(
      (operation: DetailOperation) => {
        if (operation.step === NodeStep.REFINE_EDIT) {
          dispatch(microApp.actions.toggleCanGotoSeg(true));
          dispatch(cases.actions.setOpenCaseID(caseInfo.id));
        }
        readyToOpenMicroApp();
        const canSubmit = operation.step === NodeStep.QC || operation.step === NodeStep.REFINE_EDIT;
        dispatch(microApp.actions.toggleCanSubmit(canSubmit));
        const submit = async (
          output: ToolOutput,
          makeSubmitInput: (output: ToolOutput) => Promise<any>,
        ) => {
          try {
            await dispatch(microApp.actions.patch({ operation, output, makeSubmitInput })).unwrap();
          } catch (error) {
            message.error(`Patch error:${(error as Error).message}`);
          }
        };
        loadMicroAppByStep(caseInfo, operation, submit);
      },
      [caseInfo, dispatch, readyToOpenMicroApp],
    );

    if (error) {
      console.error('Get operaions error', error);
    }
    if (!id) return null;

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
