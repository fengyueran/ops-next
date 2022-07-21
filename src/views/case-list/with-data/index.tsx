import React from 'react';

import { useCases } from 'src/hooks/use-cases';

export const withData =
  <P extends object>(
    WrappedComponent: React.ComponentType<P>,
  ): React.FC<Omit<P, 'cases' | 'pagination'>> =>
  ({ ...props }: any) => {
    const { data, error } = useCases();

    if (error) return <div>failed to load</div>;
    if (!data) return <div>loading...</div>;

    return (
      <WrappedComponent {...(props as P)} cases={data.data} pagination={data.meta.pagination} />
    );
  };
