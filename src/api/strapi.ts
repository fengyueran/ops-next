import axios from 'axios';
import qs from 'qs';

import { withInfiniteFetch } from 'src/utils';

export const STRAPI_CMS_HOST = window.STRAPI_CMS_HOST || '';

export const FETCH_CASE_PATH = '/api/cases';

const FETCH_OPERATION_PATH = '/api/operations';

const LOGIN_PATH = '/api/auth/local';

interface Query {
  pagenation: {
    page: number;
    pageSize: number;
  };
}
export const strapifetcher = (path: string, pagenation: Query) => {
  const query = qs.stringify(
    {
      sort: ['createdAt:desc'],
      ...pagenation,
    },
    {
      encodeValuesOnly: true,
    },
  );
  const url = `${STRAPI_CMS_HOST}${path}?${query}`;

  return axios.get(url).then((res) => res.data);
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
    const url = `${STRAPI_CMS_HOST}${FETCH_OPERATION_PATH}?${query}`;
    const data = await axios.get<any, { data: FetchResponse }>(url);
    return data.data;
  },
);

export const getOperation = async (operationID: string): Promise<OperationData> => {
  const url = `${STRAPI_CMS_HOST}${FETCH_OPERATION_PATH}/${operationID}`;
  const { data } = await axios.get<any, OperationFetchResponse>(url);
  return data.data;
};

export const login = async (identifier: string, password: string): Promise<any> => {
  const loginUrl = `${STRAPI_CMS_HOST}${LOGIN_PATH}`;
  const { data } = await axios.post(loginUrl, {
    identifier,
    password,
  });
  return data.data;
};

// export const getOperation = async (workflowID: string, step: string): Promise<OperationData> => {
//   const query = qs.stringify(
//     {
//       sort: ['createdAt:desc'],
//       filters: {
//         $and: [
//           {
//             workflowID: {
//               $eq: workflowID,
//             },
//           },
//           {
//             step: {
//               $eq: step,
//             },
//           },
//         ],
//       },
//     },
//     {
//       encodeValuesOnly: true,
//     },
//   );

//   const url = `${STRAPI_CMS_HOST}${FETCH_OPERATION_PATH}?${query}`;

//   const { data } = await axios.get<any, OperationFetchResponse>(url);

//   return data.data[0];
// };
