/// <reference types="react-scripts" />

interface Window {
  STRAPI_CMS_HOST?: string;
  WORKFLOW_SERVER_URL?: string;
  QC_TOOL_HOST?: string;
  MaskEdit_TOOL_HOST?: string;
  Review_TOOL_HOST?: string;
  Report_TOOL_HOST?: string;
  downloadFile: (filePath: string) => void;
}
enum CaseStatus {
  'WAITING_QC' = 'waiting-qc',
  'WAITING_SEGMENT' = 'waiting-rough-seg',
  'WAITING_RIFINE' = 'waiting-exact-seg',
  'WAITING_REVIEW' = 'waiting-review',
  'WAITING_REPORT' = 'waiting-report',
  'WAITING_RETURN' = 'waiting-return',
  'RETURNED' = 'returned',
}

interface Operator {
  status: Status;
  input: any;
  output?: any;
}

enum Priority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

interface CaseBaseInfo {
  uploadedAt: string; //number?
  resultReturnedAt?: string;
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
  editID?: string;
  workflowFailed: boolean;
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

type CaseInfo = CaseBaseInfo & DicomTag;

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
  pdf_json: string;
  qcf: string;
  startIndex: string;
  count: string;
  targetSeries: string;
}

type QCToolOutput = Omit<QCSubmitInput, 'qcf'> & {
  qcf: boolean;
};

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

type ReportOutputData = {
  path: string;
  data: Uint8Array;
};
type ReportToolOutput = {
  reportData: ReportOutputData[];
  cprPlane: ReportOutputData[];
  leftMeshVtp: ReportOutputData;
  rightMeshVtp: ReportOutputData;
  reportPdf: ReportOutputData;
  reportJson: ReportOutputData;
};

type QCSubmit = (input: QCToolOutput) => void;
type SegSubmit = (input: SegToolOutput) => void;
type RefineSubmit = (input: RefineToolOutput) => void;
type ReviewSubmit = (input: ReviewToolOutput) => void;
type ReportSubmit = (input: ReportToolOutput) => void;

type SubmitInput = QCSubmitInput | SegSubmitInput;

type ToolOutput =
  | QCToolOutput
  | SegToolOutput
  | RefineToolOutput
  | ReviewToolOutput
  | ReportToolOutput;

type MakeSubmit =
  | QCToolOutput
  | SegToolOutput
  | RefineToolOutput
  | ReviewToolOutput
  | ReportToolOutput;

interface QCToolInput {
  getDicom: GetDicom;
  seriesList: string[];
  thumbnailList: string[];
  getAutoQCResultFile: GetAutoQCResultFile;
  submit?: QCSubmit;
}

enum MaskEditType {
  Segment = 'Segment',
  Refine = 'Refine',
}
interface MaskEditToolInput {
  getNifti: GetNifti;
  getMask: GetMask;
  editType: MaskEditType;
  submit?: SegSubmit;
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
  submit?: ReviewSubmit;
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
  submit?: ReportSubmit;
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

enum NodeStep {
  'DICOM_PARSE' = 'dicom-parse',
  'QC' = 'qc',
  'DICOM2_NIFTI' = 'dicom2-nifti',
  'SEGMENT' = 'dicom-vessel-segment',
  'SEGMENT_EDIT' = 'vessel-segment-edit',
  'REFINE' = 'vessel-refine',
  'REFINE_EDIT' = 'vessel-refine-mask',
  'LUMEN_REFINEMENT_CL' = 'lumen-refinement-cl',
  'SZ_FFR' = 'sz-ffr',
  'CARS_GEN_THUMBNAIL' = 'cars-gen-thumbnail',
  'VALIDATE_FFR' = 'validate-ffr',
  'GEN_CPR_PLY' = 'gen-cpr-ply',
  'REPORT' = 'report',
  'COMPLETE' = 'complete',
  'RETURNED' = 'returned',
}
interface OperationDataAttributes {
  step: NodeStep;
  activityID: string;
  workflowID: string;
  createdAt: string;
  runID: string;
  input: NodeInput[];
  output?: NodeInput[];
}

interface FetchResponse {
  data: any[];
  meta: {
    pagination: {
      page: number;
      pageCount: number;
      pageSize: number;
      total: number;
    };
  };
}

interface OperationFlatData extends OperationDataAttributes {
  id: string;
}

interface DetailOperation extends OperationFlatData {
  passed?: boolean;
  thumbnail?: string;
  targetSeries?: string;
}

interface OperationData {
  id: string;
  attributes: OperationDataAttributes;
}

interface OperationFetchResponse {
  data: {
    data: OperationData;
    meta: {
      pagination: Pagination;
    };
  };
}

interface UntarFile {
  name: string;
  buffer: ArrayBuffer;
}

interface Series {
  UID: string;
  passed: boolean;
  warning: QCWarning[];
  error: QCError[];
  SeriesNumber: number;
  selected: boolean;
  tags: OriginTag & {
    SliceInterval: number;
    SeriesInstanceUID: string;
    SeriesNumber: number;
    NumberOfSlices: number;
  };
}
