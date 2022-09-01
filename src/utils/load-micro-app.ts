import { format } from 'date-fns';

import { fetchFileWithCache, fullPath, uploadFiles } from 'src/api';
import { MaskEditType, microAppMgr } from 'src/utils';
import { CaseStatus, NodeOutput, NodeStep } from 'src/type';

type Submit = (output: ToolOutput, makeSubmitInput: (output: any) => Promise<any>) => void;
const findFileByName = (name: string, inputs: NodeInput[]) => {
  const found = inputs.find(({ Name }) => Name === name);
  if (!found) throw new Error(`Can't find the file which name is ${name}`);
  if (!found.Value) throw new Error(`${name} Value is null`);
  return found;
};

const makeQCToolInput = (operation: OperationDataAttributes, submit?: QCSubmit) => {
  const inputs = operation.input;
  const getDicom = async (dicomPath: string) => {
    const fileList = await fetchFileWithCache<UntarFile[]>(dicomPath);
    const validFiles = fileList.filter(({ buffer }) => buffer.byteLength > 0);
    const bufferList = validFiles.map(({ buffer }) => buffer);

    return bufferList;
  };

  const getAutoQCResultFile = async () => {
    const node = findFileByName('dicom_info', inputs);
    const data = await fetchFileWithCache<AutoQCInfo>(node.Value);
    return data;
  };

  const seriesList = JSON.parse(findFileByName('series', inputs)?.Value);
  const thumbnailList = JSON.parse(findFileByName('thumbnails', inputs)?.Value).map(
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

const makeMaskEditToolInput = (
  operation: OperationDataAttributes,
  editType: MaskEditType,
  submit?: SegSubmit,
) => {
  const { input, output } = operation;

  const getNifti = async () => {
    const node = findFileByName(NodeOutput.NIFTI, input);
    const data = await fetchFileWithCache<ArrayBuffer>(node.Value);
    return data;
  };

  const getMask = async () => {
    let node;

    if (editType === MaskEditType.Segment) {
      if (output) {
        node = findFileByName(NodeOutput.EDITED_SEGMENT_MASK, output);
      } else {
        node = findFileByName(NodeOutput.SEGMENT_MASK, input);
      }
    } else {
      if (output) {
        node = findFileByName(NodeOutput.EDITED_REFINE_MASK, output);
      } else {
        node = findFileByName(NodeOutput.REFINE_MASK, input);
      }
    }

    const data = await fetchFileWithCache<ArrayBuffer>(node.Value);
    return data;
  };

  return {
    getNifti,
    getMask,
    editType,
    submit,
  };
};

const makeQCSubmitInput = async (data: QCToolOutput) => {
  const { qcf, pdf_json, ...res } = data;
  if (qcf) {
    const { path } = await uploadFiles([{ path: 'qcReport.json', data: pdf_json }]);
    return { qcf: 'true', pdf_json: path, ...res };
  }
  return { qcf: 'false', pdf_json: '', ...res };
};

const makeReviewSubmitInput = async (data: ReviewToolOutput) => {
  const { leftMeshVtp, rightMeshVtp } = data;
  //   const { path } = await uploadFile('leftMeshVtp.vtp', leftMeshVtp);
  //   const { path } = await uploadFile('rightMeshVtp.vtp', rightMeshVtp);
  return { leftMeshVtp, rightMeshVtp };
};

const makeReportSubmitInput = async (data: ReportToolOutput) => {
  const makeUploadData = (file: ReportOutputData | ReportOutputData[]) => {
    if (Array.isArray(file)) {
      return file.map(({ path, data }) => ({
        path,
        data: data.buffer as ArrayBuffer,
      }));
    }
    return [
      {
        path: file.path,
        data: file.data.buffer as ArrayBuffer,
      },
    ];
  };

  const uploadTasks = [
    'reportData',
    'cprPlane',
    'leftMeshVtp',
    'rightMeshVtp',
    'reportPdf',
    'reportJson',
  ].map((fileName) => {
    const file = (data as any)[fileName];
    const uploadData = makeUploadData(file);
    return uploadFiles(uploadData);
  });

  const res = await Promise.all(uploadTasks);

  return {
    reportData: res[0].path,
    cprPlane: res[1].path,
    leftMeshVtp: res[2].path,
    rightMeshVtp: res[3].path,
    reportPdf: res[4].path,
    reportJson: res[5].path,
  };
};

const makeReivewToolInput = (
  operation: OperationDataAttributes,
  caseInfo: CaseInfo,
  submit?: ReviewSubmit,
) => {
  const inputs = operation.input;

  const getNifti = async () => {
    const node = findFileByName('nifti', inputs);
    const data = await fetchFileWithCache<ArrayBuffer>(node.Value);
    return data;
  };

  const getMask = async () => {
    const node = findFileByName('refine_aorta_and_arteries', inputs);
    const maskBuffer = await fetchFileWithCache<ArrayBuffer>(node.Value);
    return maskBuffer;
  };

  const getPly = async () => {
    const node = findFileByName(NodeOutput.PLY, inputs);
    const data = await fetchFileWithCache<string>(node.Value);
    return data;
  };

  const getCenterlines = async () => {
    const vtpTasks = ['left_cl_1Dmesh_vtp', 'right_cl_1Dmesh_vtp'].map((name) => {
      const node = findFileByName(name, inputs);
      return fetchFileWithCache<string>(node.Value);
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
    submit:
      submit &&
      (() => {
        const leftMeshVtp = findFileByName('left_cl_1Dmesh_vtp', inputs)?.Value;
        const rightMeshVtp = findFileByName('right_cl_1Dmesh_vtp', inputs)?.Value;
        submit({ leftMeshVtp, rightMeshVtp });
      }),
  };
};

const makeReportToolInput = (
  operation: OperationDataAttributes,
  caseInfo: CaseInfo,
  submit?: ReportSubmit,
) => {
  const inputs = operation.input;

  const getPly = async () => {
    const node = findFileByName('ply', inputs);
    const data = await fetchFileWithCache<ArrayBuffer>(node.Value, 'arraybuffer');
    return data;
  };

  const getCPR = async (filePath: string) => {
    const data = await fetchFileWithCache<ArrayBuffer>(filePath);
    return data;
  };

  const getSphere = async () => {
    const node = findFileByName('cprSphere', inputs);
    const data = await fetchFileWithCache<ArrayBuffer>(node.Value);
    return data;
  };

  const getCenterlines = async () => {
    const vtpTasks = ['leftMeshVtp', 'rightMeshVtp'].map((name) => {
      const node = findFileByName(name, inputs);
      return fetchFileWithCache<ArrayBuffer>(node.Value, 'arraybuffer');
    });
    const vtps = await Promise.all(vtpTasks);
    return vtps;
  };

  const cprFilePathList = JSON.parse(findFileByName('cprs', inputs)?.Value);

  return {
    caseInfo: {
      caseId: caseInfo.caseID,
      reportId: caseInfo.caseID,
      id: caseInfo.PatientID!,
      checkDate: caseInfo.StudyDate!,
      reportDate: format(new Date(caseInfo.uploadAt), 'yyyy-MM-dd HH:mm:ss'),
      patientName: caseInfo.PatientName!,
      gender: caseInfo.PatientSex!,
      age: caseInfo.PatientAge!,
      hospital: caseInfo.InstitutionName!,
    },
    getPly,
    getCPR,
    getSphere,
    getCenterlines,
    cprFilePathList,
    submit,
  };
};

const loadQCTool = (operation: DetailOperation, submit?: Submit) => {
  const qcSubmit = submit && ((output: QCToolOutput) => submit(output, makeQCSubmitInput));
  microAppMgr.loadQCTool(makeQCToolInput(operation, qcSubmit));
};

const makeSegSubmitInput = async (data: SegToolOutput) => {
  const { mask } = data;
  const { path } = await uploadFiles([{ path: 'segMask.nii.gz', data: mask }]);
  return { [NodeOutput.EDITED_SEGMENT_MASK]: path };
};

const loadSegMaskEditTool = (operation: DetailOperation, submit?: Submit) => {
  const segSubmit = submit && ((output: SegToolOutput) => submit(output, makeSegSubmitInput));
  microAppMgr.loadMaskEditTool(makeMaskEditToolInput(operation, MaskEditType.Segment, segSubmit));
};

const makeRefineSubmitInput = async (data: RefineToolOutput) => {
  const { mask } = data;
  const { path } = await uploadFiles([{ path: 'refineMask.nii.gz', data: mask }]);
  return { [NodeOutput.EDITED_REFINE_MASK]: path };
};

const loadRefineMaskEditTool = (operation: DetailOperation, submit?: Submit) => {
  const refineSubmit =
    submit && ((output: RefineToolOutput) => submit(output, makeRefineSubmitInput));
  microAppMgr.loadMaskEditTool(makeMaskEditToolInput(operation, MaskEditType.Refine, refineSubmit));
};

const loadReviewTool = (caseInfo: CaseInfo, operation: DetailOperation, submit?: Submit) => {
  const reviewSubmit =
    submit && ((output: ReviewToolOutput) => submit(output, makeReviewSubmitInput));
  microAppMgr.loadReviewTool(makeReivewToolInput(operation, caseInfo, reviewSubmit));
};

const loadReportTool = (caseInfo: CaseInfo, operation: DetailOperation, submit?: Submit) => {
  const reportSubmit =
    submit && ((output: ReportToolOutput) => submit(output, makeReportSubmitInput));
  microAppMgr.loadReportTool(makeReportToolInput(operation, caseInfo, reportSubmit));
};

export const loadMicroAppByStatus = (
  caseInfo: CaseInfo,
  operation: DetailOperation,
  submit: Submit,
) => {
  const loadMicroAppMap: { [key: string]: Function } = {
    [CaseStatus.WAITING_QC]: () => loadQCTool(operation, submit),
    [CaseStatus.WAITING_SEGMENT]: () => loadSegMaskEditTool(operation, submit),
    [CaseStatus.WAITING_RIFINE]: () => loadRefineMaskEditTool(operation, submit),
    [CaseStatus.WAITING_REVIEW]: () => loadReviewTool(caseInfo, operation, submit),
    [CaseStatus.WAITING_REPORT]: () => loadReportTool(caseInfo, operation, submit),
  };

  const load = loadMicroAppMap[caseInfo.progress];
  if (load) {
    load();
  } else {
    throw new Error('There is no corresponding tool!');
  }
};

export const loadMicroAppByStep = (
  caseInfo: CaseInfo,
  operation: DetailOperation,
  submit?: Submit,
) => {
  console.log('operation', operation.step);
  const loadMicroAppMap: { [key: string]: Function } = {
    [NodeStep.QC]: () => loadQCTool(operation, submit),
    [NodeStep.SEGMENT_EDIT]: () => loadSegMaskEditTool(operation, submit),
    [NodeStep.REFINE_EDIT]: () => loadRefineMaskEditTool(operation, submit),
    [NodeStep.VALIDATE_FFR]: () => loadReviewTool(caseInfo, operation, submit),
    [NodeStep.REPORT]: () => loadReportTool(caseInfo, operation, submit),
  };

  const load = loadMicroAppMap[operation.step];
  if (load) {
    load();
  } else {
    throw new Error('There is no corresponding tool!');
  }
};
