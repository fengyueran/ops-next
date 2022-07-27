import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { microAppMgr } from 'src/utils';
import * as other from 'src/redux/other';

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>) =>
  ({ ...props }) => {
    const dispatch = useDispatch();
    const onClick = useCallback(() => {
      microAppMgr.unmount();
      dispatch(other.otherActions.toggleMicroAppVisible(false));
    }, [dispatch]);

    return <WrappedComponent {...(props as P)} onClick={onClick} />;
  };
