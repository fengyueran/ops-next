import A, { AxiosInstance, AxiosError } from 'axios';

export const STRAPI_CMS_HOST = window.STRAPI_CMS_HOST || '';

class Fetcher {
  private _axios?: AxiosInstance;

  initAxios = (token: string, onUnauthorizedError: () => void) => {
    this._axios = A.create({
      baseURL: STRAPI_CMS_HOST,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    this._axios.interceptors.response.use(undefined, (error: AxiosError) => {
      if (error?.response?.status === 401) {
        onUnauthorizedError();
      } else {
        return Promise.reject(error);
      }
    });
  };

  get axios(): AxiosInstance {
    if (!this._axios) {
      throw new Error('It must be init axios');
    }
    return this._axios!;
  }
}

export const fetcher = new Fetcher();
