import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { message } from 'antd';

import { loadMicroAppByStatus } from 'src/utils';
import { microApp } from 'src/redux';
import { AppDispatch } from 'src/store';
import { getOperation } from 'src/api';

interface Props {
  caseInfo: CaseInfo;
}

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Props> =>
  ({ ...props }) => {
    const { caseInfo } = props;

    const dispatch = useDispatch<AppDispatch>();

    const onClick = useCallback(async () => {
      try {
        dispatch(microApp.actions.toggleMicroAppVisible(true));
        dispatch(microApp.actions.toggleCanSubmit(true));
        const { id, attributes: operation } = await getOperation(caseInfo.editID!);

        const submit = async (output: object, makeSubmitInput: (output: any) => Promise<any>) => {
          try {
            await dispatch(
              microApp.actions.submit({ operation, output, makeSubmitInput }),
            ).unwrap();
          } catch (error) {
            message.error(`Submit error:${(error as Error).message}`);
          }
        };

        loadMicroAppByStatus(caseInfo, { id, ...operation }, submit);
      } catch (error) {
        message.error(`Load error: ${(error as Error).message}`);
      }
    }, [dispatch, caseInfo]);

    return <WrappedComponent {...(props as P)} disabled={!caseInfo.enableEdit} onClick={onClick} />;
  };
