import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { user } from 'src/redux';
import { RoutesMap } from 'src/routes';

export const withData =
  <P extends object>(
    WrappedComponent: React.ComponentType<P>,
  ): React.FC<Omit<P, 'username' | 'logout'>> =>
  ({ ...props }) => {
    const navigate = useNavigate();
    const username = useSelector(user.selectors.user)?.username;
    const dispatch = useDispatch();

    const logout = useCallback(() => {
      dispatch(user.actions.reset());
      navigate(RoutesMap.LOGIN);
    }, [dispatch, navigate]);

    return <WrappedComponent {...(props as P)} username={username!} logout={logout} />;
  };
