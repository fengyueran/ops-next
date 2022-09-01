import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { useCases } from 'src/hooks/use-cases';
import { caseFilter } from 'src/redux';

export const withData =
  <P extends object>(
    WrappedComponent: React.ComponentType<P>,
  ): React.FC<Omit<P, 'cases' | 'pagination' | 'onPageChange' | 'onChange'>> =>
  ({ ...props }: any) => {
    const dispatch = useDispatch();

    const onPageChange = useCallback(
      (page: number, pageSize: number) => {
        dispatch(caseFilter.actions.setPagination({ page, pageSize }));
      },
      [dispatch],
    );

    const onChange = useCallback(
      (pagination: any, filters: any, sorter: Sorter) => {
        const { column, order } = sorter;
        if (column?.field && order) {
          const sortOrder = order === 'descend' ? 'desc' : 'asc';
          dispatch(caseFilter.actions.setSort(`${column.field}:${sortOrder}`));
        } else {
          dispatch(caseFilter.actions.setSort());
        }
      },
      [dispatch],
    );

    const { data, error } = useCases();

    if (error) return <div>failed to load</div>;

    return (
      <WrappedComponent
        {...(props as P)}
        cases={data?.cases}
        pagination={data?.pagination}
        onChange={onChange}
        onPageChange={onPageChange}
      />
    );
  };
