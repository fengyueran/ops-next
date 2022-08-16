import {
  // getDicom,
  // getNifti,
  // getMask,
  // seriesList,
  // thumbnailList,
  //   getPly,
  //   getCenterlines,
  // getAutoQCResultFile,
  getPlyBuffer,
  getCenterlineBuffers,
  getCPR,
  getSphere,
  cprFilePathList,
} from 'src/mock';

import {
  // fetchFile,
  // uploadFile,
  fetchFileWithCache,
  fullPath,
  //   completeNode,
  // fetchGzipFile,
  //   fetchEditOperation,
  uploadFile,
} from 'src/api';
import { MaskEditType } from 'src/utils';

const findFileByName = (name: string, inputs: NodeInput[]) => {
  const found = inputs.find(({ Name }) => Name === name);
  if (!found) throw new Error(`Can't find the file which name is ${name}`);
  return found;
};

export const makeQCToolInput = (operation: OperationDataAttributes, submit: QCSubmit) => {
  const inputs = operation.input;
  const getDicom = async (dicomPath: string) => {
    const fileList = await fetchFileWithCache<UntarFile[]>(dicomPath);
    const validFiles = fileList.filter(({ buffer }) => buffer.byteLength > 0);
    const bufferList = validFiles.map(({ buffer }) => buffer);

    return bufferList;
  };

  const getAutoQCResultFile = async () => {
    const node = findFileByName('dicom_info', inputs);
    const data = await fetchFileWithCache<AutoQCInfo>(node?.Value!);
    return data;
  };

  const seriesList = JSON.parse(findFileByName('series', inputs)?.Value!);
  const thumbnailList = JSON.parse(findFileByName('thumbnails', inputs)?.Value!).map(
    (thumbPath: string) => fullPath(thumbPath),
  );

  return {
    getDicom,
    seriesList,
    thumbnailList,
    getAutoQCResultFile,
    submit,
  };
};

export const makeMaskEditToolInput = (
  operation: OperationDataAttributes,
  editType: MaskEditType,
  submit: SegSubmit,
) => {
  const inputs = operation.input;

  const getNifti = async () => {
    const node = findFileByName('nifti_file', inputs);
    const data = await fetchFileWithCache<ArrayBuffer>(node?.Value!);
    return data;
  };

  const getMask = async () => {
    const node = findFileByName(
      editType === MaskEditType.Segment ? 'aorta_and_arteries_comp' : 'refine_aorta_and_arteries',
      inputs,
    );
    const data = await fetchFileWithCache<ArrayBuffer>(node?.Value!);
    return data;
  };

  return {
    getNifti,
    getMask,
    editType,
    submit,
  };
};

export const makeQCSubmitInput = async (data: QCToolOutput) => {
  return data;
};

export const makeSegSubmitInput = async (data: SegToolOutput) => {
  const { mask } = data;
  const { path } = await uploadFile('segMask.nii.gz', mask);
  return { edited_aorta_and_arteries_comp: path };
};

export const makeRefineSubmitInput = async (data: RefineToolOutput) => {
  const { mask } = data;
  const { path } = await uploadFile('refineMask.nii.gz', mask);
  return { edited_refine_aorta_and_arteries: path };
};

export const makeReviewSubmitInput = async (data: ReviewToolOutput) => {
  const { leftMeshVtp, rightMeshVtp } = data;
  //   const { path } = await uploadFile('leftMeshVtp.vtp', leftMeshVtp);
  //   const { path } = await uploadFile('rightMeshVtp.vtp', rightMeshVtp);
  return { leftMeshVtp, rightMeshVtp };
};

export const makeReivewToolInput = (
  operation: OperationDataAttributes,
  caseInfo: CaseInfo,
  submit: ReviewSubmit,
) => {
  const inputs = operation.input;

  const getNifti = async () => {
    const node = findFileByName('nifti', inputs);
    const data = await fetchFileWithCache<ArrayBuffer>(node?.Value!);
    return data;
  };

  const getMask = async () => {
    const node = findFileByName('refine_aorta_and_arteries', inputs);
    const maskBuffer = await fetchFileWithCache<ArrayBuffer>(node?.Value!);
    return maskBuffer;
  };

  const getPly = async () => {
    const node = findFileByName('ply_file', inputs);
    const data = await fetchFileWithCache<string>(node?.Value!);
    return data;
  };

  const getCenterlines = async () => {
    const vtpTasks = ['left_cl_1Dmesh_vtp', 'right_cl_1Dmesh_vtp'].map((name) => {
      const node = findFileByName(name, inputs);
      return fetchFileWithCache<string>(node?.Value!);
    });
    const vtps = await Promise.all(vtpTasks);
    return vtps;
  };

  return {
    caseInfo: {
      PatientName: caseInfo.PatientName!,
      PatientSex: caseInfo.PatientSex!,
      PatientAge: caseInfo.PatientAge!,
      PatientID: caseInfo.PatientID!,
      StudyDate: caseInfo.StudyDate!,
      AccessionNumber: caseInfo.AccessionNumber,
    },
    getNifti,
    getMask,
    getPly,
    getCenterlines,
    submit: () => {
      const leftMeshVtp = findFileByName('left_cl_1Dmesh_vtp', inputs)?.Value!;
      const rightMeshVtp = findFileByName('right_cl_1Dmesh_vtp', inputs)?.Value!;
      submit({ leftMeshVtp, rightMeshVtp });
    },
  };
};

export const makeReportToolInput = (inputs: NodeInput[]) => {
  return {
    caseInfo: {
      caseId: 'HT-HFDK8G',
      reportId: 'HT-HFDK8G',
      id: 'PatientID',
      checkDate: '09/09/2020',
      reportDate: '09/09/2020',
      patientName: '张三',
      gender: 'M',
      age: '17',
      hospital: '重庆西南医院',
    },
    getPly: getPlyBuffer,
    getCPR,
    getSphere,
    getCenterlines: getCenterlineBuffers,
    cprFilePathList,
  };
};
