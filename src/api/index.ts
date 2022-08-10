import axios from 'axios';

export const HOST = (window as any).STRAPI_CMS_URL || '';

export const FETCH_CASE_PATH = '/api/cases';

export const fetcher = (path: string) => {
  const url = `${HOST}${path}`;
  return axios.get(url).then((res) => res.data);
};
