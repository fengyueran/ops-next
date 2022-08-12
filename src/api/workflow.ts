//@ts-ignore
import untar from 'js-untar';
import axios from 'axios';

import { unZip, withCache } from 'src/utils';

interface UploadFileResponse {
  content: string;
  fileId: string;
  path: string;
}

const WORKFLOW_HOST = window.WORKFLOW_SERVER_URL || '';

const FILE_PATH = '/v1/ops/files/download';
const UPLOAD_PATH = '/v1/ops/files/upload';
const COMPLETE_PATH = '/v1/ops/case';
const OPERATION_PATH = '/v1/ops/case/edit/operation';

export const fetchFile = async (filePath: string): Promise<any> => {
  const url = `${WORKFLOW_HOST}${FILE_PATH}/${filePath}`;
  const { data } = await axios.get(url);
  return data;
};

export const fetchEditOperation = async (caseID: string): Promise<EditOperationData> => {
  const url = `${WORKFLOW_HOST}${OPERATION_PATH}/${caseID}`;
  const { data } = await axios.get<EditOperationFetchResponse>(url);
  if (data.code !== 200) {
    throw new Error(`Get Edit operation error:${data.message}`);
  }
  return data.data;
};

export const fetchGzipFile = async (filePath: string): Promise<ArrayBuffer> => {
  const url = `${WORKFLOW_HOST}${FILE_PATH}/${filePath}`;
  const { data } = await axios.get(url, {
    responseType: 'arraybuffer',
  });

  const unZipped = await unZip(data);
  return unZipped.buffer;
};

export const fetchGzipAndTarFile = async (filePath: string): Promise<any> => {
  const unZipped = await fetchGzipFile(filePath);
  const untared = await untar(unZipped);
  return untared;
};

export const fetchGzipFileWithCache = withCache(fetchGzipFile);

export const fetchGzipAndTarFileWithCache = withCache(fetchGzipAndTarFile);

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
