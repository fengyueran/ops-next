import React, { useCallback } from 'react';
// import { useDispatch } from 'react-redux';
// import { message } from 'antd';

// import { AppDispatch } from 'src/store';
// import { getOperation } from 'src/api';
// import { CaseStatus, NodeStep } from 'src/type';

interface Props {
  // caseInfo: CaseInfo;
}

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Props> =>
  ({ ...props }) => {
    // const { caseInfo } = props;

    // const dispatch = useDispatch<AppDispatch>();

    const onClick = useCallback(async (data: { status: string }) => {
      console.log('OnClick', data);
    }, []);

    return <WrappedComponent {...(props as P)} onClick={onClick} />;
  };
