export enum NodeStep {
  DICOM_PARSE = 'dicom-parse',
  QC = 'quality-control',
  DICOM2_NIFTI = 'dicom2-nifti',
  SEGMENT = 'dicom-vessel-segment',
  SEGMENT_EDIT = 'vessel-segment-edit',
  REFINE = 'vessel-refine',
  REFINE_EDIT = 'vessel-refine-edit',
  LUMEN_REFINEMENT_CL = 'lumen-refinement-cl',
  SZ_FFR = 'sz-ffr',
  GEN_THUMBNAIL = 'gen-thumbnail',
  VALIDATE_FFR = 'validate-ffr',
  GEN_CPR_PLY = 'gen-cpr-ply',
  REPORT = 'report',
  RETURNED = 'returned',
}

export enum CaseStatus {
  'SCHEDULED' = 'SCHEDULED',
  'COMPLETED' = 'COMPLETED',
  'QCFAILED' = 'Invalid Data',
}

export enum CaseProgress {
  WAITING_QC = 'waiting-qc',
  WAITING_SEGMENT = 'waiting-rough-seg',
  WAITING_RIFINE = 'waiting-exact-seg',
  WAITING_REVIEW = 'waiting-review',
  WAITING_REPORT = 'waiting-report',
  WAITING_RETURN = 'waiting-return',
  RETURNED = 'returned',
}

export enum Priority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

export enum NodeOutput {
  DICOM_INFO = 'dicom_info',
  NIFTI = 'nifti',
  PLY = 'ply',
  THUMBNAILS = 'thumbnails',
  TARGET_SERIES = 'targetSeries',
  QC_FAILED = 'qcf',
  SEGMENT_MASK = 'aorta_and_arteries_comp',
  REFINE_MASK = 'refine_aorta_and_arteries',
  EDITED_SEGMENT_MASK = 'edited_aorta_and_arteries_comp',
  EDITED_REFINE_MASK = 'edited_refine_aorta_and_arteries',
}

export enum ErrorType {
  LoadOperationError = 'Load operation error',
  SubmitError = 'Submit error',
  PatchError = 'Patch error',
  OpenToolError = 'OpenTool error',
  LoadLogError = 'LoadLog error',
  LoginError = 'Login error',
  DownloadLogError = 'Download log error',
}

export const StatusColorMap = {
  [CaseProgress.WAITING_QC]: 'rgba(0,0,0,0.25)',
  [CaseProgress.WAITING_SEGMENT]: '#40A9FF',
  [CaseProgress.WAITING_RIFINE]: '#FD7943',
  [CaseProgress.WAITING_REVIEW]: '#6236FF',
  [CaseProgress.WAITING_REPORT]: '#177DDC',
  [CaseProgress.WAITING_RETURN]: '#F5A623',
  [CaseProgress.RETURNED]: '#52C41A',
};
