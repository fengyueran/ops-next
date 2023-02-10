import { format } from 'date-fns';

import {
  fetchFileWithCache,
  getThumbnailPath,
  uploadFilesWithFormData,
  uploadFile,
  ContentType,
} from 'src/api';
import { MaskEditType, microAppMgr, findFileByName } from 'src/utils';
import { CaseProgress, NodeOutput, NodeStep } from 'src/type';

type Submit = (
  output: ToolOutput,
  makeSubmitInput: (output: any, operation: any) => Promise<any>,
) => void;

const getLang = (language?: string) => {
  if (language === 'en') return 'en';
  return 'zh';
};

const makeQCToolInput = (
  operation: OperationDataAttributes,
  submit?: QCSubmit,
  language?: string,
) => {
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
    lang: getLang(language),
  };
};

const makeMaskEditToolInput = (
  operation: OperationDataAttributes,
  editType: MaskEditType,
  submit?: SegSubmit,
  readonly?: boolean,
  language?: string,
) => {
  const { input, output, uuid } = operation;

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
    maskCacheID: !readonly && uuid,
    lang: getLang(language),
  };
};

const makeQCSubmitInput = async (data: QCToolOutput) => {
  const { qcf, pdf_json, ...res } = data;
  if (qcf) {
    const { path } = await uploadFilesWithFormData([{ path: 'qcReport.json', data: pdf_json }]);
    return { qcf: 'true', pdf_json: path, ...res };
  }
  return { qcf: 'false', pdf_json: '', ...res };
};

const makeReviewSubmitInput = async (
  data: ReviewToolOutput,
  operation: OperationDataAttributes,
) => {
  const { leftMeshVtp, rightMeshVtp, thumbnail } = data;
  const inputs = operation.input;

  const leftMeshVtpInput = findFileByName('left_vtp', inputs)?.value;
  const rightMeshVtpInput = findFileByName('right_vtp', inputs)?.value;
  const uploadThumbnail = uploadFile(thumbnail, 'thumbnail.png');
  if (leftMeshVtp && rightMeshVtp) {
    const files = [
      { path: 'leftMeshVtp.vtp', data: leftMeshVtp },
      { path: 'rightMeshVtp.vtp', data: rightMeshVtp },
    ];
    const uploadVTPTasks = files.map((file) => uploadFilesWithFormData([file]));
    const [left_vtp, right_vtp, thumbnailRes] = await Promise.all([
      ...uploadVTPTasks,
      uploadThumbnail,
    ]);
    return { left_vtp: left_vtp.path, right_vtp: right_vtp.path, thumbnail: thumbnailRes.path };
  } else if (leftMeshVtp) {
    const [left_vtp, thumbnailRes] = await Promise.all([
      uploadFilesWithFormData([{ path: 'leftMeshVtp.vtp', data: leftMeshVtp }]),
      uploadThumbnail,
    ]);
    return { left_vtp: left_vtp.path, right_vtp: rightMeshVtpInput, thumbnail: thumbnailRes.path };
  } else if (rightMeshVtp) {
    const [right_vtp, thumbnailRes] = await Promise.all([
      uploadFilesWithFormData([{ path: 'rightMeshVtp.vtp', data: rightMeshVtp }]),
      uploadThumbnail,
    ]);

    return { left_vtp: leftMeshVtpInput, right_vtp: right_vtp.path, thumbnail: thumbnailRes.path };
  }

  const thumbnailRes = await uploadThumbnail;

  return { left_vtp: leftMeshVtpInput, right_vtp: rightMeshVtpInput, thumbnail: thumbnailRes.path };
};

const makeReportSubmitInput = async (output: ReportToolOutput) => {
  const { isPositive, ...data } = output;
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
    { key: 'reportData' },
    { key: 'cprPlane' },
    { key: 'leftMeshVtp', fileName: 'leftMesh.vtp', type: ContentType.XML },
    { key: 'rightMeshVtp', fileName: 'rightMesh.vtp', type: ContentType.XML },
    { key: 'reportPdf', fileName: 'report.pdf', type: ContentType.PDF },
    { key: 'reportJson', fileName: 'report.json', type: ContentType.JSON },
  ].map(({ key, fileName, type }) => {
    const fileKey = key as keyof typeof data;
    const file = data[fileKey];
    if (fileName) {
      const fileData = file as ReportOutputData;
      return uploadFile(fileData.data.buffer, fileName, type);
    }
    const uploadData = makeUploadData(file);
    return uploadFilesWithFormData(uploadData);
  });

  const res = await Promise.all(uploadTasks);

  return {
    isPositive,
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
  readonly?: boolean,
  language?: string,
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
    if (node.value.endsWith('json')) {
      const data = await fetchFileWithCache<ArrayBuffer>(node.value, 'arraybuffer');
      return data;
    }
    const data = await fetchFileWithCache<UntarFile[]>(node.value);
    return data[0].buffer;
  };

  const getCenterlines = async () => {
    const getVTP = async (node: any) => {
      if (node.value.endsWith('vtp')) {
        const data = await fetchFileWithCache<ArrayBuffer>(node.value, 'arraybuffer');
        return data;
      }
      const data = await fetchFileWithCache<UntarFile[]>(node.value);
      return data[0].buffer;
    };

    const vtpTasks = ['leftMeshVtp', 'rightMeshVtp'].map((name) => {
      const node = findFileByName(name, operation.output || inputs);
      return getVTP(node);
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
    readonly: readonly === undefined ? !!operation.output : readonly,
    getReportJson: operation.output && getReportJson,
    lang: getLang(language),
  };
};

const loadQCTool = (operation: DetailOperation, submit?: Submit, language?: string) => {
  const qcSubmit = submit && ((output: QCToolOutput) => submit(output, makeQCSubmitInput));
  microAppMgr.loadQCTool(makeQCToolInput(operation, qcSubmit, language));
};

const makeMaskOutput = async (data: SegToolOutput, editType: MaskEditType) => {
  const { mask, thumbnail } = data;
  const maskName = editType === MaskEditType.Segment ? 'segMask.nii.gz' : 'refineMask.nii.gz';

  const uploadTasks = [
    uploadFilesWithFormData([{ path: maskName, data: mask }]),
    uploadFile(thumbnail, 'thumbnail.png'),
  ];
  const [maskRes, thumbnailRes] = await Promise.all(uploadTasks);
  if (editType === MaskEditType.Segment) {
    return { [NodeOutput.EDITED_SEGMENT_MASK]: maskRes.path, thumbnail: thumbnailRes.path };
  }
  return { [NodeOutput.EDITED_REFINE_MASK]: maskRes.path, thumbnail: thumbnailRes.path };
};

const makeSegSubmitInput = (data: SegToolOutput) => {
  return makeMaskOutput(data, MaskEditType.Segment);
};

const loadSegMaskEditTool = (
  operation: DetailOperation,
  submit?: Submit,
  readonly?: boolean,
  language?: string,
) => {
  const segSubmit = submit && ((output: SegToolOutput) => submit(output, makeSegSubmitInput));
  microAppMgr.loadMaskEditTool(
    makeMaskEditToolInput(operation, MaskEditType.Segment, segSubmit, readonly, language),
  );
};

const makeRefineSubmitInput = async (data: RefineToolOutput) => {
  return makeMaskOutput(data, MaskEditType.Refine);
};

const loadRefineMaskEditTool = (
  operation: DetailOperation,
  submit?: Submit,
  readonly?: boolean,
  language?: string,
) => {
  const refineSubmit =
    submit && ((output: RefineToolOutput) => submit(output, makeRefineSubmitInput));
  microAppMgr.loadMaskEditTool(
    makeMaskEditToolInput(operation, MaskEditType.Refine, refineSubmit, readonly, language),
  );
};

const loadReviewTool = (caseInfo: CaseInfo, operation: DetailOperation, submit?: Submit) => {
  const reviewSubmit =
    submit && ((output: ReviewToolOutput) => submit(output, makeReviewSubmitInput));
  microAppMgr.loadReviewTool(makeReivewToolInput(operation, caseInfo, reviewSubmit));
};

const loadReportTool = (
  caseInfo: CaseInfo,
  operation: DetailOperation,
  submit?: Submit,
  readonly?: boolean,
  language?: string,
) => {
  const reportSubmit =
    submit && ((output: ReportToolOutput) => submit(output, makeReportSubmitInput));
  microAppMgr.loadReportTool(
    makeReportToolInput(operation, caseInfo, reportSubmit, readonly, language),
  );
};

export const loadMicroAppByStatus = (
  caseInfo: CaseInfo,
  operation: DetailOperation,
  submit: Submit,
  language?: string,
) => {
  const loadMicroAppMap: { [key: string]: Function } = {
    [CaseProgress.WAITING_QC]: () => loadQCTool(operation, submit, language),
    [CaseProgress.WAITING_SEGMENT]: () => loadSegMaskEditTool(operation, submit, false, language),
    [CaseProgress.WAITING_RIFINE]: () => loadRefineMaskEditTool(operation, submit, false, language),
    [CaseProgress.WAITING_REVIEW]: () => loadReviewTool(caseInfo, operation, submit),
    [CaseProgress.WAITING_REPORT]: () =>
      loadReportTool(caseInfo, operation, submit, false, language),
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
  readonly?: boolean,
  language?: string,
) => {
  console.log('operation', operation.step);
  const loadMicroAppMap: { [key: string]: Function } = {
    [NodeStep.QC]: () => loadQCTool(operation, submit, language),
    [NodeStep.SEGMENT_EDIT]: () => loadSegMaskEditTool(operation, submit, readonly, language),
    [NodeStep.REFINE_EDIT]: () => loadRefineMaskEditTool(operation, submit, readonly, language),
    [NodeStep.VALIDATE_FFR]: () => loadReviewTool(caseInfo, operation, submit),
    [NodeStep.REPORT]: () => loadReportTool(caseInfo, operation, submit, readonly, language),
  };

  const load = loadMicroAppMap[operation.step];
  if (load) {
    load();
  } else {
    throw new Error('There is no corresponding tool!');
  }
};
