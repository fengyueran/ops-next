import { loadDataFromLocalForage, saveDataToLocalForage } from './local-forage';

export const withCache = (fn: (url: string) => Promise<any>) => {
  return async (url: string) => {
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      const data = await loadDataFromLocalForage(url);
      if (data) {
        console.log(`load data from cache,key=${url}`);
        return data;
      }
    }
    const data = await fn(url);
    if (isDev) {
      await saveDataToLocalForage(url, data);
    }
    return data;
  };
};
