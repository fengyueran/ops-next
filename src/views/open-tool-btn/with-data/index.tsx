import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { MicroApp } from 'src/utils';
import * as other from 'src/redux/other';

interface Props {
  toolName: MicroApp;
}
export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Props> =>
  ({ ...props }) => {
    const dispatch = useDispatch();
    const onClick = useCallback(() => {
      dispatch(other.otherActions.toggleMicroAppVisible(true));
    }, [dispatch]);

    return <WrappedComponent {...(props as P)} onClick={onClick} />;
  };
