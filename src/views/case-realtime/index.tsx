import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { io, Socket } from 'socket.io-client';

import { STRAPI_CMS_HOST, PREFIX } from 'src/api';
import { cases, user, caseFilter } from 'src/redux';

export const CaseRealtime = () => {
  const socketRef = useRef<Socket>();
  const filterRef = useRef<Filters>({});
  const dispatch = useDispatch();
  const token = useSelector(user.selectors.token);
  const filters = useSelector(caseFilter.selectors.filters);

  useMemo(() => {
    filterRef.current = filters;
  }, [filters]);

  const handleCaseCreated = useCallback(
    (data: { data: CaseData }) => {
      console.log('case:created', data);
      if (data.data) {
        dispatch(cases.actions.addCase({ caseData: data.data, filters: filterRef.current }));
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
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      socketRef.current = io(STRAPI_CMS_HOST, {
        auth: {
          token,
        },
        path: `${PREFIX}/socket.io`,
      });
      socketRef.current.on('connect', () => {
        console.log('connect success');
        socketRef.current!.on('case:create', handleCaseCreated);
        socketRef.current!.on('case:update', handleCaseUpdated);
      });
    }
  }, [handleCaseCreated, handleCaseUpdated, token]);

  return null;
};
