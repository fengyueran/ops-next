import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Spin } from 'antd';
import { useSelector, useDispatch } from 'react-redux';

import { cases, caseDetail, microApp } from 'src/redux';
import { useOperationsAndSeries } from 'src/hooks';
import { loadMicroAppByStep } from 'src/utils';
import { RootState, AppDispatch } from 'src/store';

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
  ): React.FC<Omit<P, 'caseInfo' | 'series' | 'operations' | 'onOperationClick'>> =>
  ({ ...props }) => {
    const dispatch = useDispatch<AppDispatch>();
    const id = useSelector(caseDetail.selectors.selectedCaseID);
    const caseInfo = useSelector((state: RootState) => cases.selectors.getCaseByID(state, id!));

    const { data, error } = useOperationsAndSeries(id && caseInfo?.workflowID);

    const onOperationClick = useCallback(
      (operation: DetailOperation) => {
        dispatch(microApp.actions.toggleCanSubmit(false));
        dispatch(microApp.actions.toggleMicroAppVisible(true));
        dispatch(caseDetail.actions.setSelectCaseID());
        loadMicroAppByStep(caseInfo, operation);
      },
      [caseInfo, dispatch],
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
        onOperationClick={onOperationClick}
      />
    );
  };
