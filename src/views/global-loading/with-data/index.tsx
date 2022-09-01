import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { FormattedMessage } from 'react-intl';

import { microApp } from 'src/redux';

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>) =>
  ({ ...props }) => {
    const submitPending = useSelector(microApp.selectors.submitPending);
    const gotoSegLoading = useSelector(microApp.selectors.gotoSegLoading);

    const loading = gotoSegLoading || submitPending;
    const tip = useMemo(() => {
      if (submitPending) return <FormattedMessage defaultMessage="提交中..." />;
      return <FormattedMessage defaultMessage="加载中..." />;
    }, [submitPending]);

    return <WrappedComponent {...(props as P)} loading={loading} tip={tip} />;
  };
