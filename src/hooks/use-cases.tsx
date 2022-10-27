import useSWR from 'swr';
import { useSelector, useDispatch } from 'react-redux';

import { strapifetcher, FETCH_CASE_PATH, Query } from 'src/api';
import { cases as casesRedux, caseFilter } from 'src/redux';
import { useEffect, useMemo } from 'react';

//localDateStr只有年月日，如：2022-08-25
const convertLocalDateToTimestamp = (localDateStr: string) => {
  const date = new Date(`${localDateStr}T00:00:00`);
  return date.getTime();
};

const makeQuery = (caseQueryState: caseFilter.State) => {
  const { pagination, sort } = caseQueryState;

  const makeFilter = () => {
    const { caseID, PatientID, ffrAccessionNumber, dateRange, statusList, priorityList } =
      caseQueryState.filters;
    const fields = [];
    if (PatientID) {
      fields.push({ PatientID: { $contains: PatientID } });
    }
    if (caseID) {
      fields.push({ caseID: { $contains: caseID } });
    }

    if (ffrAccessionNumber) {
      fields.push({ ffrAccessionNumber: { $contains: ffrAccessionNumber } });
    }
    if (statusList) {
      fields.push({ progress: { $in: statusList } });
    }

    if (priorityList) {
      fields.push({ priority: { $in: priorityList } });
    }
    //本地时间
    if (dateRange) {
      const [start, end] = dateRange.map((dateStr) => convertLocalDateToTimestamp(dateStr));
      const oneDay = 3600 * 24 * 1000; //ms
      fields.push({ uploadAt: { $gte: start, $lt: end + oneDay } });
    }
    if (fields.length) {
      return { $and: fields };
    }
    return null;
  };

  const query: Query = { pagination };

  const filters = makeFilter();
  if (filters) {
    query.filters = filters;
  }

  if (sort) {
    query.sort = [sort];
  }

  return query;
};

export const useCases = () => {
  const caseQueryState = useSelector(caseFilter.selectors.caseFilter);

  const query = useMemo(() => {
    return makeQuery(caseQueryState);
  }, [caseQueryState]);

  const dispatch = useDispatch();
  const { data, error } = useSWR<CaseFetchResponse>([FETCH_CASE_PATH, query], strapifetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
    refreshInterval: 0,
  });

  const cases = useSelector(casesRedux.selectors.cases);
  const pagination = useSelector(casesRedux.selectors.pagination);

  useEffect(() => {
    if (data) {
      dispatch(casesRedux.actions.addCases(data));
    }
  }, [data, dispatch]);

  console.log('cases', cases);

  return { data: data ? { cases, pagination } : undefined, error };
};
