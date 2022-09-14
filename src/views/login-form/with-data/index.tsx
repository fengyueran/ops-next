import React, { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { AxiosError } from 'axios';
import { useIntl } from 'react-intl';

import { other, user } from 'src/redux';
import { RoutesMap } from 'src/routes';
import { ErrorType } from 'src/type';
import { login } from 'src/api';

type LoginError = AxiosError<{
  error: {
    name: string;
    status: number;
    message: string;
  };
}>;

export const withData =
  <P extends object>(
    WrappedComponent: React.ComponentType<P>,
  ): React.FC<Omit<P, 'onLogin' | 'initialValues' | 'pending'>> =>
  ({ ...props }: any) => {
    const intl = useIntl();
    const [pending, setPending] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const loginInfo = useSelector(user.selectors.loginInfo);

    const handleError = useCallback(
      async (error: LoginError) => {
        setPending(false);
        const resError = error.response?.data?.error;
        const blocked = resError?.status === 400 && resError?.message?.includes('has been blocked');
        if (blocked) {
          message.warn(intl.formatMessage({ defaultMessage: '该账户为禁用状态，请联系实施同学' }));
        } else {
          const validationError = resError?.name === 'ValidationError';
          if (validationError) {
            message.error(intl.formatMessage({ defaultMessage: '用户名或密码错误' }));
          } else {
            dispatch(
              other.actions.setError({
                type: ErrorType.LoginError,
                detail: (error as Error).message,
              }),
            );
          }
        }
      },
      [dispatch, intl],
    );

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
          handleError(error as LoginError);
        }
      },
      [dispatch, navigate, handleError],
    );

    return (
      <WrappedComponent
        {...(props as P)}
        onLogin={onLogin}
        initialValues={loginInfo}
        pending={pending}
      />
    );
  };
