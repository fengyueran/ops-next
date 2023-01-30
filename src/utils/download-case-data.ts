//@ts-ignore
import untar from 'js-untar';
import { zip } from 'fflate';

import { downloadByBuffer, decompress } from 'src/utils';
import { NodeStep, NodeOutput } from 'src/type';
import { getOperationsByWFID, fetchCommonFileWithCache } from 'src/api';

export const downloadCaseData = async (workflowID: string, PatientID: string = '-') => {
  const targetFiles = [
    { fileKey: NodeOutput.NIFTI, fileName: `${PatientID}_iso.nii.gz`, step: NodeStep.REPORT },
    {
      fileKey: NodeOutput.LEFT_MESH_VTP,
      fileName: `${PatientID}_Left_cl_1Dmesh.vtp`,
      step: NodeStep.REPORT,
    },
    {
      fileKey: NodeOutput.RIGHT_MESH_VTP,
      fileName: `${PatientID}_Right_cl_1Dmesh.vtp`,
      step: NodeStep.REPORT,
    },
    { fileKey: NodeOutput.PLY, fileName: `${PatientID}_aorta+both.ply`, step: NodeStep.REPORT },
    {
      fileKey: NodeOutput.REPORT_EDITED_REFINE_MASK,
      fileName: `${PatientID}_edited_refine_aorta_and_arteries.nii.gz`,
      step: NodeStep.REPORT,
    },
    {
      fileKey: NodeOutput.REFINE_MASK,
      fileName: `${PatientID}_refine_aorta_and_arteries.nii.gz`,
      step: NodeStep.REFINE_EDIT,
    },
    {
      fileKey: NodeOutput.SEGMENT_MASK,
      fileName: `${PatientID}_aorta_and_arteries_comp.nii.gz`,
      step: NodeStep.SEGMENT_EDIT,
    },
  ];
  const originOperations = await getOperationsByWFID(workflowID);

  const getFile = async (fileName: string, filePath: string) => {
    const buffer = await fetchCommonFileWithCache<ArrayBuffer>(filePath, 'arraybuffer');
    return { fileName, data: new Uint8Array(buffer) };
  };

  const getFileAndUntar = async (fileName: string, filePath: string) => {
    const { data, ...res } = await getFile(fileName, filePath);
    const decompressed = await decompress(data.buffer);
    const untarFiles: UntarFile[] = await untar(decompressed.buffer);

    return { data: new Uint8Array(untarFiles[0].buffer), ...res };
  };

  const tasks = targetFiles
    .map(({ step, fileKey, fileName }) => {
      const found = originOperations.find(({ attributes }) => attributes.step === step);
      const file = found?.attributes.input[fileKey]?.value;
      if (!file) return null;
      if (file.endsWith('tgz')) return getFileAndUntar(fileName, file);

      return getFile(fileName, file);
    })
    .filter((v) => !!v);

  const files = (await Promise.all(tasks)) as {
    fileName: string;
    data: Uint8Array;
  }[];

  const fileMap: { [key: string]: Uint8Array } = {};
  files.forEach(({ fileName, data }) => {
    fileMap[fileName] = data;
  });

  await new Promise((reslove, reject) => {
    zip(fileMap, (error, data) => {
      if (error) {
        reject(error);
      } else {
        downloadByBuffer(`${PatientID}.zip`, data.buffer);
        reslove(1);
      }
    });
  });
};
