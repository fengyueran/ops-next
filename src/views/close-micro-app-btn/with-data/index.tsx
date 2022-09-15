import React, { useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { microApp } from 'src/redux';
import { microAppMgr, LoadStatus } from 'src/utils';

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>) =>
  ({ ...props }) => {
    const dispatch = useDispatch();
    const canCloseMicroApp = useSelector(microApp.selectors.canCloseMicroApp);
    const onClick = useCallback(() => {
      dispatch(microApp.actions.toggleMicroAppVisible(false));
    }, [dispatch]);

    useEffect(() => {
      const onStatusChange = (status: LoadStatus) => {
        dispatch(microApp.actions.toggleCanCloseMicroApp(status === LoadStatus.MOUNTED));
      };

      microAppMgr.subscribeStatusChange(onStatusChange);
    }, [dispatch]);

    return <WrappedComponent {...(props as P)} onClick={onClick} disabled={!canCloseMicroApp} />;
  };
