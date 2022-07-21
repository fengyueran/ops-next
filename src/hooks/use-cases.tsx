import useSWR from 'swr';

import { fetcher, FETCH_CASE_PATH } from 'src/api';

export const useCases = () => {
  const res = useSWR<CaseFetchResponse>(FETCH_CASE_PATH, fetcher);
  return res;
};
