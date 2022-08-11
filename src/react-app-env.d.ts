/// <reference types="react-scripts" />

interface Window {
  STRAPI_CMS_HOST?: string;
  WORKFLOW_SERVER_URL?: string;
}

type Status = 'Failed' | 'Completed' | 'Pending' | 'Running';

interface Operator {
  status: Status;
  input: any;
  output?: any;
}

type Priority = 'High' | 'Medium' | 'Low';

interface Base {
  uploadedAt: number; //number?
  resultReturnedAt?: number;
  tags?: string[];
  narrowDegree?: number; //狭窄程度
  status?: Status;
  step: Step;
  isReaded: boolean; //是否已读，默认false
  priority: Priority;
  isPositive?: boolean; //阴阳性
  ffrAccessionNumber?: string; //CTFFR检查号，手动录入
  name?: string; //手动录入
  workflowID: string;
  caseID: string;
}

interface DicomTag {
  StudyDate?: string;
  PatientID?: string;
  PatientSex?: string;
  PatientAge?: string;
  PatientName?: string;
  AccessionNumber: string;
  InstitutionName?: string;
  StudyInstanceUID: string;
  PatientBirthDate?: string;
  Description?: string;
}

type CaseInfo = Base & DicomTag;

interface CaseData {
  id: string;
  attributes: CaseInfo;
}

interface Pagination {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}

interface CaseFetchResponse {
  data: CaseData[];
  meta: {
    pagination: Pagination;
  };
}

interface OriginTag {
  SeriesInstanceUID: string;
  SeriesNumber: number;
  Rows: number;
  Columns: number;
  Modality: string;
  SeriesDate: string;
  SeriesTime: string;
  SeriesDescription: string;
  SliceThickness: number;
  KVP: number;
  CTDIvol: string;
  XRayTubeCurrent: string;
  ConvolutionKernel: string;
  ContrastBolusAgent: string;
  InplaneResolution: string;
  BodyPartExamined: string;
  InplaneDimension: string;
  PatientAge: string;
  Manufacturer: string;
  AccessionNumber: string;
  InstitutionName: string;
  PatientName: string;
  PatientBirthDate: string;
  PatientSex: string;
  PixelSpacing: string;
  WindowCenter: string;
  WindowWidth: string;
}

interface QCError {
  type: number;
  hint: object;
}

interface QCWarning {
  type: number;
}

interface BaseQCInfo {
  UID: string;
  passed: boolean;
  warning: QCWarning[];
  error: QCError[];
  SeriesNumber: number;
  tags: {
    SliceInterval: number;
    SeriesInstanceUID: string;
    SeriesNumber: number;
    NumberOfSlices: number;
  };
  originTags: OriginTag;
}

interface AutoQCInfo {
  passed: BaseQCInfo[];
  failed: BaseQCInfo[];
}

type GetDicom = (seriesPath: string) => Promise<ArrayBuffer[]>;

type GetNifti = () => Promise<ArrayBuffer>;

type GetMask = () => Promise<ArrayBuffer>;

type GetPly = () => Promise<string>;

type GetCenterlines = () => Promise<string[]>;

type GetPlyBuffer = () => Promise<ArrayBuffer>;

type GetCenterlineBuffers = () => Promise<ArrayBuffer[]>;

type GetCPR = (path: string) => Promise<ArrayBuffer>;

type GetSphere = () => Promise<ArrayBuffer>;

type GetAutoQCResultFile = () => Promise<AutoQCInfo>;

type QCSubmitInput = {
  pdf_json?: string;
  qcf: string;
  startIndex: string;
  count: string;
  targetSeries: string;
};

type QCSubmit = (input: QCSubmitInput) => void;
interface QCToolInput {
  getDicom: GetDicom;
  seriesList: string[];
  thumbnailList: string[];
  getAutoQCResultFile: GetAutoQCResultFile;
  submit: QCSubmit;
}

interface MaskEditToolInput {
  getNifti: GetNifti;
  getMask: GetMask;
  editType: string;
}

interface ReviewToolInput {
  caseInfo: {
    PatientName: string;
    PatientSex: string;
    PatientAge: string;
    PatientID: string;
    StudyDate: string;
    AccessionNumber: string;
  };
  getNifti: GetNifti;
  getMask: GetMask;
  getPly: GetPly;
  getCenterlines: GetCenterlines;
}

interface ReportToolInput {
  caseInfo: {
    caseId: string;
    reportId: string;
    id: string;
    checkDate: string;
    reportDate: string;
    patientName: string;
    gender: string;
    age: string;
    hospital: string;
  };
  cprFilePathList: string[];
  getPly: GetPlyBuffer;
  getCPR: GetCPR;
  getSphere: GetSphere;
  getCenterlines: GetCenterlineBuffers;
}

interface Message {
  type: string;
  data: any;
}

interface NodeInput {
  Name: string;
  Type: string;
  Path: string;
  Value: string;
  Optional: boolean;
}

interface OperationData {
  id: string;
  attributes: {
    input: [NodeInput, NodeInput, NodeInput, NodeInput];
  };
}

interface OperationFetchResponse {
  data: OperationData[];
  meta: {
    pagination: Pagination;
  };
}

interface UntarFile {
  buffer: ArrayBuffer;
}

interface EditOperationFetchResponse {
  step: string;
  activityID: string;
  workflowID: string;
  input: NodeInput[];
}
