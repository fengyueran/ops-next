import axios from 'axios';
import qs from 'qs';

export const STRAPI_CMS_HOST = window.STRAPI_CMS_HOST || '';

export const FETCH_CASE_PATH = '/api/cases';

const FETCH_OPERATION_PATH = '/api/operations';

export const strapifetcher = (path: string) => {
  const url = `${STRAPI_CMS_HOST}${path}`;
  return axios.get(url).then((res) => res.data);
};

export const getOperation = async (
  workflowID: string,
  step: string,
): Promise<OperationFetchResponse> => {
  const query = qs.stringify(
    {
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

  const { data } = await axios.get(url);

  return data;
};
