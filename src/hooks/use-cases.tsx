import useSWR from 'swr';

import { strapifetcher, FETCH_CASE_PATH } from 'src/api';

export const useCases = () => {
  const res = useSWR<CaseFetchResponse>(FETCH_CASE_PATH, strapifetcher);
  console.log('cases', res.data);
  return res;
};
