//@ts-ignore
import untar from 'js-untar';
import axios from 'axios';

import { unZip, loadDataFromLocalForage, saveDataToLocalForage } from 'src/utils';

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

export const fetchEditOperation = async (caseID: string): Promise<EditOperationFetchResponse> => {
  const url = `${WORKFLOW_HOST}${OPERATION_PATH}/${caseID}`;
  const { data } = await axios.get(url);
  return data;
};

export const fetchCompressedFile = async (filePath: string): Promise<any> => {
  const url = `${WORKFLOW_HOST}${FILE_PATH}/${filePath}`;
  const { data } = await axios.get(url, {
    responseType: 'arraybuffer',
  });

  const unZipped = await unZip(data);
  const untared = await untar(unZipped.buffer);
  return untared;
};

export const fetchCompressedFileWithCache = async (filePath: string): Promise<any> => {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    const res = await loadDataFromLocalForage(filePath);
    if (res) return res as ArrayBuffer;
  }

  const data = await fetchCompressedFile(filePath);
  if (isDev) {
    await saveDataToLocalForage(filePath, data);
  }

  return data;
};

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
  const { data } = await axios.post(uploadUrl, {
    data: formData,
  });
  return data;
};

export const fullPath = (path: string) => {
  const fileUrl = `${WORKFLOW_HOST}${FILE_PATH}`;
  return `${fileUrl}/${path}`;
};
