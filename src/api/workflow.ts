//@ts-ignore
import untar from 'js-untar';
import axios from 'axios';

import { decompress, withCache, download } from 'src/utils';

interface UploadFileResponse {
  content: string;
  fileId: string;
  path: string;
}

const WORKFLOW_HOST = window.WORKFLOW_SERVER_URL || '';

const FILE_PATH = '/v1/ops/files/download';
const UPLOAD_PATH = '/v1/ops/files/upload';
const COMPLETE_PATH = '/v1/ops/case';

const fetchCommonFile = async (filePath: string): Promise<any> => {
  const url = `${WORKFLOW_HOST}${FILE_PATH}/${filePath}`;
  const { data } = await axios.get(url);
  return data;
};

// export const fetchEditOperation = async (caseID: string): Promise<EditOperationData> => {
//   const url = `${WORKFLOW_HOST}${OPERATION_PATH}/${caseID}`;
//   const { data } = await axios.get<EditOperationFetchResponse>(url);
//   if (data.code !== 200) {
//     throw new Error(`Get Edit operation error:${data.message}`);
//   }
//   return data.data;
// };

const fetchGzipFile = async (filePath: string): Promise<ArrayBuffer> => {
  const url = `${WORKFLOW_HOST}${FILE_PATH}/${filePath}`;
  const { data } = await axios.get(url, {
    responseType: 'arraybuffer',
  });

  const decompressped = await decompress(data);
  return decompressped.buffer;
};

const fetchGzipAndTarFile = async (filePath: string): Promise<UntarFile[] | ArrayBuffer> => {
  const decompressped = await fetchGzipFile(filePath);

  const untarFiles: UntarFile[] = await untar(decompressped);

  const shouldUnGzip = untarFiles.length === 1 && untarFiles[0].name?.endsWith('gz');
  if (shouldUnGzip) {
    const unGzipBuffer = await decompress(untarFiles[0].buffer);
    return unGzipBuffer.buffer;
  }
  return untarFiles;
};

export const fetchFile = async <T = Response>(filePath: string): Promise<T> => {
  let data;
  if (filePath.endsWith('.tgz')) {
    data = await fetchGzipAndTarFile(filePath);
  } else if (filePath.endsWith('.gz')) {
    data = await fetchGzipFile(filePath);
  } else {
    data = await fetchCommonFile(filePath);
  }
  return data;
};

export const fetchFileWithCache = withCache(fetchFile);

export const completeNode = async (workflowID: string, activityID: string, results: object) => {
  const completeUrl = `${WORKFLOW_HOST}${COMPLETE_PATH}/${workflowID}/${activityID}/complete`;
  await axios.post(completeUrl, {
    data: results,
  });
};

export const uploadFile = async (name: string, buffer: ArrayBuffer | string) => {
  const uploadUrl = `${WORKFLOW_HOST}${UPLOAD_PATH}`;
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const formData = new FormData();
  formData.append(name, blob);
  const { data } = await axios.post<UploadFileResponse>(uploadUrl, formData, {
    headers: { 'Content-Type': `multipart/form-data` },
  });
  return data;
};

export const fullPath = (path: string) => {
  const fileUrl = `${WORKFLOW_HOST}${FILE_PATH}`;
  return `${fileUrl}/${path}`;
};

export const downloadFile = async (filePath: string) => {
  const url = fullPath(filePath);
  download('data', url);
};

window.downloadFile = downloadFile;
