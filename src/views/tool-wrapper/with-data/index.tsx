import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { microAppMgr } from 'src/utils';
import { microApp } from 'src/redux';

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>) =>
  ({ ...props }) => {
    const visible = useSelector(microApp.selectors.microAppVisible);

    useEffect(() => {
      if (!visible) {
        microAppMgr.unmount();
      }
    }, [visible]);

    return <WrappedComponent {...(props as P)} visible={visible} />;
  };
