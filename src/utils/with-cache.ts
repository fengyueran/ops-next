import { ResponseType } from 'axios';
import { loadDataFromLocalForage, saveDataToLocalForage } from './local-forage';
import { getFileName } from './get-file-name';

export const withCache = (fn: (url: string, responseType?: ResponseType) => Promise<any>) => {
  return async <T = Response>(url: string, responseType?: ResponseType) => {
    const isDev = process.env.NODE_ENV === 'development';
    const key = getFileName(url);

    if (isDev) {
      const data = await loadDataFromLocalForage(key);
      if (data) {
        console.log(`load data from cache,key=${url}`);
        return data as T;
      }
    }
    const data = await fn(url, responseType);
    if (isDev) {
      await saveDataToLocalForage(key, data);
    }
    return data as T;
  };
};
