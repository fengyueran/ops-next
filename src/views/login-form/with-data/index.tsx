import React, { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { other, user } from 'src/redux';
import { RoutesMap } from 'src/routes';
import { ErrorType } from 'src/type';
import { login } from 'src/api';

export const withData =
  <P extends object>(
    WrappedComponent: React.ComponentType<P>,
  ): React.FC<Omit<P, 'onLogin' | 'initialValues' | 'pending'>> =>
  ({ ...props }: any) => {
    const [pending, setPending] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const loginInfo = useSelector(user.selectors.loginInfo);

    const onLogin = useCallback(
      async (values: { username: string; password: string; remember: boolean }) => {
        setPending(true);
        const { username, password, remember } = values;
        dispatch(user.actions.setLoginInfo(remember ? values : undefined));
        try {
          const data = await login(username, password);
          dispatch(user.actions.setUser(data));

          navigate(RoutesMap.ROOT);
        } catch (error) {
          setPending(false);
          dispatch(
            other.actions.setError({
              type: ErrorType.LoginError,
              detail: (error as Error).message,
            }),
          );
        }
      },
      [dispatch, navigate],
    );

    console.log('loginInfo', loginInfo);
    return (
      <WrappedComponent
        {...(props as P)}
        onLogin={onLogin}
        initialValues={loginInfo}
        pending={pending}
      />
    );
  };
