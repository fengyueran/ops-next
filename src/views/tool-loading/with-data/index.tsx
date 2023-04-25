import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FormattedMessage } from 'react-intl';

import { microAppMgr, MessageType } from 'src/utils';
import { microApp } from 'src/redux';

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>) =>
  ({ ...props }) => {
    const dispatch = useDispatch();
    const ready = useSelector(microApp.selectors.microAppReady);

    useEffect(() => {
      microAppMgr.subscribe((state) => {
        const { type } = state;
        if (type === MessageType.TOOL_READY || type === MessageType.QC_LOAD_ERROR) {
          dispatch(microApp.actions.toggleMicroAppReady(true));
        } else if (type === MessageType.SERIES_CHANGE) {
          dispatch(microApp.actions.toggleMicroAppReady(false));
        }
      });

      return () => {
        microAppMgr.unsubscribe();
      };
    }, [dispatch]);

    return (
      <WrappedComponent
        {...(props as P)}
        loading={!ready}
        tip={<FormattedMessage defaultMessage="加载中..." />}
      />
    );
  };
