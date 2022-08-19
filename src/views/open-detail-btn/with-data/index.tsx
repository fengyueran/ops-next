import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { caseDetail } from 'src/redux';

interface Props {
  id: string;
}

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Props> =>
  ({ ...props }) => {
    const { id } = props;
    const dispatch = useDispatch();

    const onClick = useCallback(() => {
      dispatch(caseDetail.actions.setSelectCaseID(id));
    }, [dispatch, id]);

    return <WrappedComponent {...(props as P)} disabled={false} onClick={onClick} />;
  };
