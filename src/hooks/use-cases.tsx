import useSWR from 'swr';
import { useSelector, useDispatch } from 'react-redux';

import { strapifetcher, FETCH_CASE_PATH } from 'src/api';
import { cases as casesRedux } from 'src/redux';
import { useEffect } from 'react';

export const useCases = (page: number) => {
  const query = {
    pagination: {
      page,
      pageSize: 10,
    },
  };

  const dispatch = useDispatch();
  const { data, error } = useSWR<CaseFetchResponse>([FETCH_CASE_PATH, query], strapifetcher);

  const cases = useSelector(casesRedux.selectors.casesSelector);
  const pagination = useSelector(casesRedux.selectors.paginationSelector);

  useEffect(() => {
    if (data) {
      dispatch(casesRedux.actions.addCases(data));
    }
  }, [data, dispatch]);

  console.log('cases', cases);

  return { data: data ? { cases, pagination } : undefined, error };
};
