import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { other, user } from 'src/redux';
import { RoutesMap } from 'src/routes';
import { ErrorType } from 'src/type';
import { login } from 'src/api';

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Omit<P, 'onLogin'>> =>
  ({ ...props }: any) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const onLogin = useCallback(
      async (values: { username: string; password: string; remember: boolean }) => {
        const { username, password } = values;

        try {
          const data = await login(username, password);
          dispatch(user.actions.setUser(data));
          navigate(RoutesMap.ROOT);
        } catch (error) {
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

    return <WrappedComponent {...(props as P)} onLogin={onLogin} />;
  };
