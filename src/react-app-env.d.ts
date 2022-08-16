/// <reference types="react-scripts" />

interface Window {
  STRAPI_CMS_HOST?: string;
  WORKFLOW_SERVER_URL?: string;
  downloadFile: (filePath: string) => void;
}
enum CaseStatus {
  'WAITING_QC' = 'waiting-qc',
  'WAITING_SEGMENT' = 'waiting-rough-seg',
  'WAITING_RIFINE' = 'waiting-exact-seg',
  'WAITING_REVIEW' = 'WAITING_REVIEW',
  'WAITING_REPORT' = 'WAITING_REPORT',
  'WAITING_RETURN' = 'WAITING_RETURN',
  'RETURNED' = 'RETURNED',
}

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
  status: CaseStatus;
  step: Step;
  isReaded: boolean; //是否已读，默认false
  priority: Priority;
  isPositive?: boolean; //阴阳性
  ffrAccessionNumber?: string; //CTFFR检查号，手动录入
  name?: string; //手动录入
  workflowID: string;
  caseID: string;
  enableEdit: boolean;
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

interface QCSubmitInput {
  pdf_json?: string;
  qcf: string;
  startIndex: string;
  count: string;
  targetSeries: string;
}

type QCToolOutput = QCSubmitInput;

interface SegSubmitInput {
  edited_aorta_and_arteries_comp: string;
}

interface SegToolOutput {
  mask: ArrayBuffer;
}

interface RefineToolOutput {
  mask: ArrayBuffer;
}

interface RefineSubmitInput {
  edited_refine_aorta_and_arteries: string;
}

interface ReviewToolOutput {
  leftMeshVtp: string;
  rightMeshVtp: string;
}

type QCSubmit = (input: QCToolOutput) => void;
type SegSubmit = (input: SegToolOutput) => void;
type RefineSubmit = (input: RefineToolOutput) => void;
type ReviewSubmit = (input: ReviewToolOutput) => void;

type SubmitInput = QCSubmitInput | SegSubmitInput;

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
  submit: SegSubmit;
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

interface OperationDataAttributes {
  step: string;
  activityID: string;
  workflowID: string;
  input: NodeInput[];
}

interface OperationData {
  id: string;
  attributes: OperationDataAttributes;
}

interface OperationFetchResponse {
  data: {
    data: OperationData[];
    meta: {
      pagination: Pagination;
    };
  };
}

interface UntarFile {
  name: string;
  buffer: ArrayBuffer;
}
