import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { useCases } from 'src/hooks/use-cases';
import { caseFilter } from 'src/redux';

export const withData =
  <P extends object>(
    WrappedComponent: React.ComponentType<P>,
  ): React.FC<Omit<P, 'cases' | 'pagination' | 'onPageChange'>> =>
  ({ ...props }: any) => {
    const page = useSelector(caseFilter.selectors.page);
    const dispatch = useDispatch();

    const onPageChange = useCallback(
      (page: number) => {
        dispatch(caseFilter.actions.setPage(page));
      },
      [dispatch],
    );

    const { data, error } = useCases(page);

    if (error) return <div>failed to load</div>;

    return (
      <WrappedComponent
        {...(props as P)}
        cases={data?.cases}
        pagination={data?.pagination}
        onPageChange={onPageChange}
      />
    );
  };
