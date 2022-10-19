//@ts-ignore
import untar from 'js-untar';
import { ResponseType } from 'axios';

import { decompress, withCache, download } from 'src/utils';
import { NodeStep } from 'src/type';
import { fetcher } from './fetcher';

interface UploadFileResponse {
  content: string;
  fileId: string;
  path: string;
}

const WORKFLOW_HOST = process.env.REACT_APP_WORKFLOW_SERVER_URL || '';

const PREFIX = '/v1/ops';
const FILE_PATH = `${PREFIX}/files/download`;
const UPLOAD_PATH = `${PREFIX}/files/upload`;
const THUMBNAIL_PATH = `${PREFIX}/files/thumbnail`;
const CASE_PATH = `${PREFIX}/case`;

export const fetchCommonFile = async (
  filePath: string,
  responseType: ResponseType = 'text',
): Promise<any> => {
  const url = `${WORKFLOW_HOST}${FILE_PATH}/${filePath}`;
  const { data } = await fetcher.axios.get(url, {
    responseType,
  });
  return data;
};

const fetchGzipFile = async (filePath: string): Promise<ArrayBuffer> => {
  const data = await fetchCommonFile(filePath, 'arraybuffer');
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

const fetchCompressedFile = async (filePath: string) => {
  let data;
  if (filePath.endsWith('.tgz')) {
    data = await fetchGzipAndTarFile(filePath);
  } else {
    data = await fetchGzipFile(filePath);
  }

  return data;
};

export const fetchFile = async <T = any>(filePath: string, responseType?: ResponseType) => {
  let data;
  if (filePath.endsWith('.tgz') || filePath.endsWith('.gz')) {
    data = await fetchCompressedFile(filePath);
  } else {
    data = await fetchCommonFile(filePath, responseType);
  }
  return data as T;
};

export const fetchFileWithCache = withCache(fetchFile);

export const patchNode = async (workflowID: string, step: NodeStep, results: object) => {
  const resetUrl = `${WORKFLOW_HOST}${CASE_PATH}/${workflowID}/reset/${step}/complete`;
  await fetcher.axios.post(resetUrl, {
    data: results,
  });
};

export const completeNode = async (workflowID: string, activityID: string, results: object) => {
  const completeUrl = `${WORKFLOW_HOST}${CASE_PATH}/${workflowID}/${activityID}/complete`;
  await fetcher.axios.post(completeUrl, {
    data: results,
  });
};

export const uploadFiles = async (files: { path: string; data: ArrayBuffer | string }[]) => {
  const uploadUrl = `${WORKFLOW_HOST}${UPLOAD_PATH}`;
  try {
    const formData = new FormData();
    files.forEach((file) => {
      const blob = new Blob([file.data], { type: 'application/octet-stream' });
      formData.append(file.path, blob);
    });
    const { data } = await fetcher.axios.post<UploadFileResponse>(uploadUrl, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  } catch (err) {
    throw err;
  }
};

export const uploadImage = async (ab: ArrayBuffer) => {
  const uploadUrl = `${WORKFLOW_HOST}${UPLOAD_PATH}`;

  const blob = new Blob([ab], { type: 'application/octet-stream' });
  const { data } = await fetcher.axios.post<UploadFileResponse>(uploadUrl, blob, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': 'inline;filename=thumbnail.png',
    },
  });
  return data;
};

export const getLog = async (workflowID: string, algoOperationID: string) => {
  const url = `${WORKFLOW_HOST}${CASE_PATH}/${workflowID}/${algoOperationID}/log?all=true`;
  const { data } = await fetcher.axios.get(url);
  return data;
};

export const fullPath = (path: string) => {
  const fileUrl = `${WORKFLOW_HOST}${FILE_PATH}`;
  return `${fileUrl}/${path}`;
};

export const getThumbnailPath = (path: string) => {
  const fileUrl = `${WORKFLOW_HOST}${THUMBNAIL_PATH}`;
  return `${fileUrl}/${path}`;
};

export const downloadFile = async (filePath: string, name?: string) => {
  const data = await fetchCommonFile(filePath, 'blob');
  const blob = new Blob([data]);
  const url = URL.createObjectURL(blob);
  const fileExt = filePath.split('.').pop();
  const fileName = name || `data.${fileExt}`;
  download(fileName, url);
};

window.downloadFile = downloadFile;
