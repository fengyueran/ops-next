import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { FormattedMessage } from 'react-intl';

import { microApp, other } from 'src/redux';

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>) =>
  ({ ...props }) => {
    const globalLoading = useSelector(other.selectors.loading);
    const submitPending = useSelector(microApp.selectors.submitPending);
    const gotoSegLoading = useSelector(microApp.selectors.gotoSegLoading);

    const loading = globalLoading.visible || gotoSegLoading || submitPending;
    const tip = useMemo(() => {
      if (globalLoading.tip) return globalLoading.tip;
      if (submitPending) return <FormattedMessage defaultMessage="提交中..." />;
      return <FormattedMessage defaultMessage="加载中..." />;
    }, [submitPending, globalLoading]);

    return <WrappedComponent {...(props as P)} loading={loading} tip={tip} />;
  };
