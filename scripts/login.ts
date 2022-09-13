import axios from 'axios';

const STRAPI_CMS_HOST = 'http://10.3.6.34:1339';
const LOGIN_PATH = '/v1/ops-strapi/api/auth/local';

export const login = async (identifier: string, password: string): Promise<any> => {
  const loginUrl = `${STRAPI_CMS_HOST}${LOGIN_PATH}`;
  const { data } = await axios.post(loginUrl, {
    identifier,
    password,
  });
  return data;
};
