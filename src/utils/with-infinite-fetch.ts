export const withInfiniteFetch = <T = FetchResponse>(
  fn: (url: string, pageNum?: number) => Promise<FetchResponse>,
) => {
  return async (url: string, pageNum?: number) => {
    let allData: T[] = [];

    const fetchData = async (fetchUrl: string, pageNum?: number) => {
      const { data, meta } = await fn(fetchUrl, pageNum);
      const { page, pageCount } = meta.pagination;
      const needLoad = page + 1 < pageCount;

      allData = [...allData, ...data];
      if (needLoad) {
        await fetchData(fetchUrl, page + 1);
      }
    };
    await fetchData(url, pageNum);

    return allData;
  };
};
