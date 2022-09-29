import { format } from 'date-fns';

import { fetchFile, fetchFileWithCache, getThumbnailPath, uploadFiles } from 'src/api';
import { MaskEditType, microAppMgr, findFileByName } from 'src/utils';
import { CaseProgress, NodeOutput, NodeStep } from 'src/type';

type Submit = (
  output: ToolOutput,
  makeSubmitInput: (output: any, operation: any) => Promise<any>,
) => void;

const makeQCToolInput = (operation: OperationDataAttributes, submit?: QCSubmit) => {
  const inputs = operation.input;
  const getDicom = async (dicomPath: string) => {
    const fileList = await fetchFileWithCache<UntarFile[]>(dicomPath);
    const validFiles = fileList.filter(({ buffer }) => buffer.byteLength > 0);
    const bufferList = validFiles.map(({ buffer }) => buffer);

    return bufferList;
  };

  const getAutoQCResultFile = async () => {
    const node = findFileByName(NodeOutput.DICOM_INFO, inputs);
    const data = await fetchFileWithCache<AutoQCInfo>(node.value);
    return data;
  };

  const seriesList = JSON.parse(findFileByName('series', inputs)?.value);
  const thumbnailList = JSON.parse(findFileByName('thumbnails', inputs)?.value).map(
    (thumbPath: string) => getThumbnailPath(thumbPath),
  );

  const targetSeries =
    operation.output && findFileByName(NodeOutput.TARGET_SERIES, operation.output)?.value;

  return {
    getDicom,
    seriesList,
    targetSeries,
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
    const data = await fetchFileWithCache<ArrayBuffer>(node.value);
    return data;
  };

  const getMask = async () => {
    let node;

    if (editType === MaskEditType.Segment) {
      if (output) {
        node = output[NodeOutput.EDITED_REFINE_MASK]
          ? findFileByName(NodeOutput.EDITED_REFINE_MASK, output)
          : findFileByName(NodeOutput.EDITED_SEGMENT_MASK, output);
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

    const data = await fetchFileWithCache<ArrayBuffer>(node.value);
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

const makeReviewSubmitInput = async (
  data: ReviewToolOutput,
  operation: OperationDataAttributes,
) => {
  const { leftMeshVtp, rightMeshVtp } = data;
  const inputs = operation.input;

  const leftMeshVtpInput = findFileByName('left_vtp', inputs)?.value;
  const rightMeshVtpInput = findFileByName('right_vtp', inputs)?.value;

  if (leftMeshVtp && rightMeshVtp) {
    const files = [
      { path: 'leftMeshVtp.vtp', data: leftMeshVtp },
      { path: 'rightMeshVtp.vtp', data: rightMeshVtp },
    ];
    const uploadTask = files.map((file) => uploadFiles([file]));
    const [left_vtp, right_vtp] = await Promise.all(uploadTask);
    return { left_vtp: left_vtp.path, right_vtp: right_vtp.path };
  } else if (leftMeshVtp) {
    const left_vtp = await uploadFiles([{ path: 'leftMeshVtp.vtp', data: leftMeshVtp }]);
    return { left_vtp: left_vtp.path, right_vtp: rightMeshVtpInput };
  } else if (rightMeshVtp) {
    const right_vtp = await uploadFiles([{ path: 'rightMeshVtp.vtp', data: rightMeshVtp }]);
    return { left_vtp: leftMeshVtpInput, right_vtp: right_vtp.path };
  }

  return { left_vtp: leftMeshVtpInput, right_vtp: rightMeshVtpInput };
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
    isPositive: data.isPositive,
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
  const outputs = operation.output;

  const getNifti = async () => {
    const node = findFileByName(NodeOutput.NIFTI, inputs);
    const data = await fetchFileWithCache<ArrayBuffer>(node.value);
    return data;
  };

  const getMask = async () => {
    const node = findFileByName(NodeOutput.REFINE_MASK, inputs);
    const maskBuffer = await fetchFileWithCache<ArrayBuffer>(node.value);
    return maskBuffer;
  };

  const getPly = async () => {
    const node = findFileByName(NodeOutput.PLY, inputs);
    const data = await fetchFileWithCache<string>(node.value);
    return data;
  };

  const getCenterlines = async () => {
    const vtpTasks = ['left_vtp', 'right_vtp'].map((name) => {
      const node = findFileByName(name, outputs || inputs);
      return fetchFileWithCache<string | UntarFile[]>(node.value);
    });
    const vtps = await Promise.all(vtpTasks);
    const newVTPs = vtps.map((vtp) => {
      if (Array.isArray(vtp)) {
        return new TextDecoder('utf-8').decode(vtp[0].buffer);
      }
      return vtp;
    });
    return newVTPs;
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
    submit,
  };
};

const makeReportToolInput = (
  operation: OperationDataAttributes,
  caseInfo: CaseInfo,
  submit?: ReportSubmit,
) => {
  const inputs = operation.input;

  const getPly = async () => {
    const node = findFileByName(NodeOutput.PLY, inputs);
    const data = await fetchFileWithCache<ArrayBuffer>(node.value, 'arraybuffer');
    return data;
  };

  const getCPR = async (filePath: string) => {
    const data = await fetchFileWithCache<ArrayBuffer>(filePath);
    return data;
  };

  const getSphere = async () => {
    const cprFile = inputs[NodeOutput.CPR_SPHERE]?.value;
    if (!cprFile) return null;
    const data = await fetchFileWithCache<ArrayBuffer>(cprFile);
    return data;
  };

  const getReportJson = async () => {
    const node = findFileByName(NodeOutput.REPORT_JSON, operation.output!);
    const data = await fetchFileWithCache<UntarFile[]>(node.value);

    return data[0].buffer;
  };

  const getCenterlines = async () => {
    const vtpTasks = ['leftMeshVtp', 'rightMeshVtp'].map((name) => {
      const node = findFileByName(name, inputs);
      return fetchFile(node.value, 'arraybuffer');
    });
    const vtps = await Promise.all(vtpTasks);
    return vtps;
  };

  const cprFilePathList = JSON.parse(findFileByName(NodeOutput.CPRS, inputs)?.value);

  return {
    caseInfo: {
      caseId: caseInfo.caseID,
      reportId: caseInfo.caseID.slice(0, 9),
      id: caseInfo.PatientID!,
      checkDate: caseInfo.StudyDate!,
      reportDate: format(new Date(caseInfo.uploadAt), 'yyyy-MM-dd HH:mm:ss'),
      patientName: caseInfo.PatientName!,
      gender: caseInfo.PatientSex!,
      age: caseInfo.PatientAge!,
      accessionNumber: caseInfo.AccessionNumber!,
    },
    getPly,
    getCPR,
    getSphere,
    getCenterlines,
    cprFilePathList,
    submit,
    readonly: !!operation.output,
    getReportJson: operation.output && getReportJson,
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
    [CaseProgress.WAITING_QC]: () => loadQCTool(operation, submit),
    [CaseProgress.WAITING_SEGMENT]: () => loadSegMaskEditTool(operation, submit),
    [CaseProgress.WAITING_RIFINE]: () => loadRefineMaskEditTool(operation, submit),
    [CaseProgress.WAITING_REVIEW]: () => loadReviewTool(caseInfo, operation, submit),
    [CaseProgress.WAITING_REPORT]: () => loadReportTool(caseInfo, operation, submit),
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
