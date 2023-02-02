import A, { AxiosInstance, AxiosError } from 'axios';

export const STRAPI_CMS_HOST = process.env.REACT_APP_STRAPI_CMS_URL || '';

class Fetcher {
  private _axios?: AxiosInstance;
  private _token?: string;

  initAxios = (token: string, onUnauthorizedError: () => void) => {
    this._token = token;
    if (!this._axios) {
      this._axios = A.create({
        baseURL: STRAPI_CMS_HOST,
      });
      this._axios.interceptors.request.use(
        (config) => {
          config!.headers!['Authorization'] = `Bearer ${this._token}`;
          return config;
        },
        (error) => {
          return Promise.reject(error);
        },
      );
      this._axios.interceptors.response.use(undefined, (error: AxiosError) => {
        if (error?.response?.status === 401) {
          onUnauthorizedError();
        } else {
          return Promise.reject(error);
        }
      });
    }
  };

  get axios(): AxiosInstance {
    if (!this._axios) {
      throw new Error('It must be init axios');
    }
    return this._axios!;
  }
}

export const fetcher = new Fetcher();
