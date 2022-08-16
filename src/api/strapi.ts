import axios from 'axios';
import qs from 'qs';

export const STRAPI_CMS_HOST = window.STRAPI_CMS_HOST || '';

export const FETCH_CASE_PATH = '/api/cases';

const FETCH_OPERATION_PATH = '/api/operations';

interface Query {
  pagenation: {
    page: number;
    pageSize: number;
  };
}
export const strapifetcher = (path: string, query: Query) => {
  const queryStr = qs.stringify(query);
  const url = `${STRAPI_CMS_HOST}${path}?${queryStr}`;
  return axios.get(url).then((res) => res.data);
};

export const getOperation = async (workflowID: string, step: string): Promise<OperationData> => {
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

  const url = `${STRAPI_CMS_HOST}${FETCH_OPERATION_PATH}?${query}`;

  const { data } = await axios.get<any, OperationFetchResponse>(url);

  return data.data[0];
};
