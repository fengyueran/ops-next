import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { useCases } from 'src/hooks/use-cases';
import { user, caseFilter } from 'src/redux';

export const withData =
  <P extends object>(
    WrappedComponent: React.ComponentType<P>,
  ): React.FC<Omit<P, 'cases' | 'pagination' | 'onPageChange' | 'onChange'>> =>
  ({ ...props }: any) => {
    const dispatch = useDispatch();
    const token = useSelector(user.selectors.token);

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

    if (!token) return null;

    const { data, error } = useCases();

    if (error) {
      console.error('Load cases error', error);
      return <div style={{ color: 'red' }}>failed to load</div>;
    }

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
