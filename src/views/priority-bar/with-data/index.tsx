import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from 'src/store';
import { caseFilter } from 'src/redux';

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>) =>
  ({ ...props }) => {
    const dispatch = useDispatch<AppDispatch>();

    const onClick = useCallback(
      async (list?: ListItem[]) => {
        const priorityList = list && list.map(({ status }) => status);
        dispatch(caseFilter.actions.updateFilter({ priorityList }));
      },
      [dispatch],
    );

    return <WrappedComponent {...(props as P)} onClick={onClick} />;
  };
