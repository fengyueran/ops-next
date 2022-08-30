import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { io } from 'socket.io-client';

import { STRAPI_CMS_HOST } from 'src/api';
import { cases } from 'src/redux';

export const CaseRealtime = () => {
  const dispatch = useDispatch();

  const handleCaseUpdated = useCallback(
    ({ data }: { data: CaseData }) => {
      console.log('case:update', data);
      if (data) {
        dispatch(cases.actions.updateCase(data));
      }
    },
    [dispatch],
  );

  useEffect(() => {
    const socket = io(STRAPI_CMS_HOST);
    socket.on('connect', () => {
      console.log('connect success');
      socket.on('case:update', handleCaseUpdated);
    });
  }, [handleCaseUpdated]);

  return null;
};
