import { useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { io } from 'socket.io-client';

import { STRAPI_CMS_HOST } from 'src/api';
import { cases, user } from 'src/redux';

export const CaseRealtime = () => {
  const dispatch = useDispatch();
  const token = useSelector(user.selectors.token);

  const handleCaseCreated = useCallback(
    (data: { data: CaseData }) => {
      console.log('case:created', data);
      if (data.data) {
        dispatch(cases.actions.addCase(data.data));
      }
    },
    [dispatch],
  );

  const handleCaseUpdated = useCallback(
    (data: { data: CaseData }) => {
      console.log('case:update', data);
      if (data.data) {
        dispatch(cases.actions.updateCase(data.data));
      }
    },
    [dispatch],
  );

  useEffect(() => {
    if (token) {
      const socket = io(STRAPI_CMS_HOST, {
        auth: {
          token,
        },
      });
      socket.on('connect', () => {
        console.log('connect success');
        socket.on('case:create', handleCaseCreated);
        socket.on('case:update', handleCaseUpdated);
      });
    }
  }, [handleCaseCreated, handleCaseUpdated, token]);

  return null;
};
