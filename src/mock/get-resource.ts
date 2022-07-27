//@ts-ignore
import untar from 'js-untar';
import * as fflate from 'fflate';

const HOST = 'http://localhost:8080';

const unZip = (ab: ArrayBuffer): Promise<Uint8Array> => {
  const u = new Uint8Array(ab);
  return new Promise((resolve, reject) => {
    fflate.decompress(u, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

export const fetchFile = async (url: string) => {
  const r = await fetch(url);
  const arrayBuffer = await r.arrayBuffer();
  return arrayBuffer;
};

export const getNifti = async () => {
  const NIFTI_URL = `${HOST}/blue_iso.nii`;
  return fetchFile(NIFTI_URL);
};

export const getDicom = async (path: string) => {
  const DICOM_TAR_URL = `${HOST}/${path}`;
  const arrayBuffer = await fetchFile(DICOM_TAR_URL);
  const unZipped = await unZip(arrayBuffer);
  const dicomFileList = await untar(unZipped.buffer);
  return dicomFileList;
};

export const getAutoQCResultFile = async () => {
  const QC_FILE_URL = `${HOST}/__info__.json`;
  const res = await fetch(QC_FILE_URL);
  const data = await res.json();
  return data;
};
