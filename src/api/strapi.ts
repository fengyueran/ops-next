import axios from 'axios';
import qs from 'qs';

import { withInfiniteFetch } from 'src/utils';
import { fetcher, STRAPI_CMS_HOST } from './fetcher';

const PREFIX = '/v1/ops-strapi';
export const FETCH_CASE_PATH = `${PREFIX}/api/cases`;

const FETCH_OPERATION_PATH = `${PREFIX}/api/operations`;

const FETCH_ALGO_OPERATION_PATH = `${PREFIX}/api/algo-operations`;

const LOGIN_PATH = `${PREFIX}/api/auth/local`;

export interface Query {
  filters?: object;
  pagination: {
    page: number;
    pageSize: number;
  };
  sort?: string[];
}

export const strapifetcher = (path: string, query: Query) => {
  const queryStr = qs.stringify(
    {
      sort: ['createdAt:desc'],
      ...query,
    },
    {
      encodeValuesOnly: true,
    },
  );
  const url = `${path}?${queryStr}`;

  return fetcher.axios.get(url).then((res) => res?.data);
};

export const getOperationsByWFID = withInfiniteFetch<OperationData>(
  async (workflowID: string, page: number = 0): Promise<FetchResponse> => {
    const query = qs.stringify(
      {
        sort: ['createdAt:desc'],
        filters: {
          workflowID: {
            $eq: workflowID,
          },
        },
        pagination: {
          pageSize: 100,
          page,
        },
      },
      {
        encodeValuesOnly: true,
      },
    );
    const url = `${FETCH_OPERATION_PATH}?${query}`;
    const data = await fetcher.axios.get<any, { data: FetchResponse }>(url);
    return data.data;
  },
);

export const getOperationByID = async (operationID: string): Promise<OperationData> => {
  const url = `${FETCH_OPERATION_PATH}/${operationID}`;
  const { data } = await fetcher.axios.get<any, OperationFetchResponse>(url);
  return data.data;
};

export const login = async (identifier: string, password: string): Promise<LoginResponse> => {
  const loginUrl = `${STRAPI_CMS_HOST}${LOGIN_PATH}`;
  const { data } = await axios.post(loginUrl, {
    identifier,
    password,
  });
  return data;
};

export const tagCaseReaded = async (id: string): Promise<void> => {
  const url = `${FETCH_CASE_PATH}/${id}`;
  await fetcher.axios.put(url, {
    data: { readed: true },
  });
};

export const getOperation = async (workflowID: string, step: string) => {
  const query = qs.stringify(
    {
      sort: ['createdAt:desc'],
      filters: {
        $and: [
          {
            workflowID: {
              $eq: workflowID,
            },
          },
          {
            step: {
              $eq: step,
            },
          },
        ],
      },
    },
    {
      encodeValuesOnly: true,
    },
  );

  const url = `${FETCH_OPERATION_PATH}?${query}`;

  const { data } = await fetcher.axios.get<
    any,
    {
      data: {
        data: OperationData[];
      };
    }
  >(url);

  return data.data[0];
};

export const getAlgoOperation = async (workflowID: string, step: string) => {
  const query = qs.stringify(
    {
      sort: ['createdAt:desc'],
      filters: {
        $and: [
          {
            workflowID: {
              $eq: workflowID,
            },
          },
          {
            step: {
              $eq: step,
            },
          },
          {
            status: {
              $eq: 3, //failed
            },
          },
        ],
      },
    },
    {
      encodeValuesOnly: true,
    },
  );

  const url = `${FETCH_ALGO_OPERATION_PATH}?${query}`;

  const { data } = await fetcher.axios.get<
    any,
    {
      data: {
        data: OperationData[];
      };
    }
  >(url);

  return data.data[0];
};
