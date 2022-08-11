import { useCallback, useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { io } from 'socket.io-client';

import { STRAPI_CMS_HOST } from 'src/api';

export const CaseRealtime = () => {
  const { mutate } = useSWRConfig();

  const handleCaseUpdated = useCallback(
    ({ data }: { data: CaseData }) => {
      console.log('case:update', data);
      mutate('/api/cases', (res: CaseFetchResponse) => {
        const cases = res.data;

        const foundIndex = cases.findIndex(({ id }) => id === data.id);
        if (foundIndex >= 0) {
          cases[foundIndex] = data;
        }
        return { ...res, data: cases };
      });
    },
    [mutate],
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
