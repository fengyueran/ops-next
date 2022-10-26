import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { caseFilter } from 'src/redux';

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Omit<P, 'onSearch'>> =>
  ({ ...props }: any) => {
    const dispatch = useDispatch();

    const onSearch = useCallback(
      (v?: string) => {
        dispatch(caseFilter.actions.updateFilter({ caseID: v }));
      },
      [dispatch],
    );

    return <WrappedComponent {...(props as P)} onSearch={onSearch} />;
  };
