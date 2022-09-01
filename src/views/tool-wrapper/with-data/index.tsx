import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { microAppMgr } from 'src/utils';
import { microApp, cases } from 'src/redux';

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>) =>
  ({ ...props }) => {
    const visible = useSelector(microApp.selectors.microAppVisible);
    const selectedCase = useSelector(cases.selectors.getSelectedCase);
    const dispatch = useDispatch();

    useEffect(() => {
      if (!visible) {
        microAppMgr.unmount();
        dispatch(microApp.actions.toggleCanGotoSeg(false));
      }
    }, [visible, dispatch]);

    return (
      <WrappedComponent {...(props as P)} visible={visible} title={selectedCase?.PatientID || ''} />
    );
  };
