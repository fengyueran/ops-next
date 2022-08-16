import * as fflate from 'fflate';

//decompress GZIP or ZLIB or DEFLAT
export const decompress = (ab: ArrayBuffer): Promise<Uint8Array> => {
  const u = new Uint8Array(ab);
  return new Promise((resolve, reject) => {
    fflate.decompress(u, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};
