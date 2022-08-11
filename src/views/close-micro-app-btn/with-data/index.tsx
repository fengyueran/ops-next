import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { microAppMgr } from 'src/utils';
import { microApp } from 'src/redux';

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>) =>
  ({ ...props }) => {
    const dispatch = useDispatch();
    const onClick = useCallback(() => {
      microAppMgr.unmount();
      dispatch(microApp.actions.toggleMicroAppVisible(false));
    }, [dispatch]);

    return <WrappedComponent {...(props as P)} onClick={onClick} />;
  };
