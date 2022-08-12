import localForage from 'localforage';

export const saveDataToLocalForage = async (key: string, arrayBuffer: ArrayBuffer) => {
  const threshold = 100 * 1024 * 1024;
  const n = Math.ceil(arrayBuffer.byteLength / threshold);
  if (arrayBuffer.byteLength > threshold) {
    for (let i = 0; i < n; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await localForage.setItem(
        `${key}/${i}`,
        arrayBuffer.slice(i * threshold, i * threshold + threshold),
      );
    }
    await localForage.setItem(
      key,
      JSON.stringify({
        cacheSliceCount: n,
        size: arrayBuffer.byteLength,
      }),
    );
  } else {
    await localForage.setItem(key, arrayBuffer);
  }
  console.log(`saveLocalForage success key=${key}, byteLength=${arrayBuffer.byteLength}`);
};

export const loadDataFromLocalForage = async (key: string) => {
  const item = await localForage.getItem(key);

  if (typeof item === 'string') {
    const v = JSON.parse(item);
    if (v && v.cacheSliceCount) {
      const arrayBuffer = new Uint8Array(v.size);
      let offset = 0;
      for (let i = 0; i < v.cacheSliceCount; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const part = await localForage.getItem(`${key}/${i}`);
        arrayBuffer.set(new Uint8Array(part as ArrayBuffer), offset);
        offset += (part as ArrayBuffer).byteLength;
      }
      return arrayBuffer.buffer;
    }
  }
  return item;
};
