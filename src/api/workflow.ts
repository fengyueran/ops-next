//@ts-ignore
import untar from 'js-untar';
import axios, { ResponseType } from 'axios';

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

export const fetchCommonFile = async (
  filePath: string,
  responseType: ResponseType = 'text',
): Promise<any> => {
  const url = `${WORKFLOW_HOST}${FILE_PATH}/${filePath}`;
  const { data } = await axios.get(url, {
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

const fetchFile = async (filePath: string, responseType?: ResponseType) => {
  let data;
  if (filePath.endsWith('.tgz') || filePath.endsWith('.gz')) {
    data = await fetchCompressedFile(filePath);
  } else {
    data = await fetchCommonFile(filePath, responseType);
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

export const uploadFiles = async (files: { path: string; data: ArrayBuffer }[]) => {
  const uploadUrl = `${WORKFLOW_HOST}${UPLOAD_PATH}`;
  try {
    const formData = new FormData();
    files.forEach((file) => {
      const blob = new Blob([file.data], { type: 'application/octet-stream' });
      formData.append(file.path, blob);
    });
    const { data } = await axios.post<UploadFileResponse>(uploadUrl, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  } catch (err) {
    throw err;
  }
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
