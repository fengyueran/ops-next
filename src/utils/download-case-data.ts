import { zip } from 'fflate';

import { downloadByBuffer } from 'src/utils';
import { NodeStep, NodeOutput } from 'src/type';
import { getOperationsByWFID, fetchCommonFileWithCache } from 'src/api';

export const downloadCaseData = async (caseID: string, workflowID: string) => {
  const targetFiles = [
    { fileKey: NodeOutput.NIFTI, fileName: `${caseID}_iso.nii.gz`, step: NodeStep.REPORT },
    {
      fileKey: NodeOutput.LEFT_MESH_VTP,
      fileName: `${caseID}_Left_cl_1Dmesh.vtp`,
      step: NodeStep.REPORT,
    },
    {
      fileKey: NodeOutput.RIGHT_MESH_VTP,
      fileName: `${caseID}_Right_cl_1Dmesh.vtp`,
      step: NodeStep.REPORT,
    },
    { fileKey: NodeOutput.PLY, fileName: `${caseID}_aorta+both.ply`, step: NodeStep.REPORT },
    {
      fileKey: NodeOutput.REPORT_EDITED_REFINE_MASK,
      fileName: `${caseID}_edited_refine_aorta_and_arteries.nii.gz`,
      step: NodeStep.REPORT,
    },
    {
      fileKey: NodeOutput.REFINE_MASK,
      fileName: `${caseID}_refine_aorta_and_arteries.nii.gz`,
      step: NodeStep.REFINE_EDIT,
    },
    {
      fileKey: NodeOutput.SEGMENT_MASK,
      fileName: `${caseID}_aorta_and_arteries_comp.nii.gz`,
      step: NodeStep.SEGMENT_EDIT,
    },
  ];
  const originOperations = await getOperationsByWFID(workflowID);

  const getFile = async (fileName: string, filePath: string) => {
    const buffer = await fetchCommonFileWithCache<ArrayBuffer>(filePath, 'arraybuffer');
    return { fileName, data: new Uint8Array(buffer) };
  };

  const tasks = targetFiles
    .map(({ step, fileKey, fileName }) => {
      const found = originOperations.find(({ attributes }) => attributes.step === step);
      const file = found?.attributes.input[fileKey]?.value;
      if (file) {
        return getFile(fileName, file);
      }
      return null;
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
        downloadByBuffer(`${caseID}.zip`, data.buffer);
        reslove(1);
      }
    });
  });
};
