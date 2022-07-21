import axios from 'axios';

const HOST = process.env.REACT_APP_STRAPI_CMS_URL || '';

export const FETCH_CASE_PATH = '/api/cases?populate=*';

export const fetcher = (path: string) => {
  const url = `${HOST}${path}`;
  return axios.get(url).then((res) => res.data);
};
