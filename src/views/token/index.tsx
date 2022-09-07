import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { fetcher } from 'src/api';
import { RoutesMap } from 'src/routes';
import { user } from 'src/redux';

export const Token = () => {
  const navigate = useNavigate();
  const token = useSelector(user.selectors.token);

  useMemo(() => {
    if (token) {
      fetcher.initAxios(token, () => {
        navigate(RoutesMap.LOGIN);
      });
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) {
      navigate(RoutesMap.LOGIN);
    }
  }, [navigate, token]);

  return null;
};
