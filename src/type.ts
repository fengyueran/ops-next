export enum NodeStep {
  'DICOM_PARSE' = 'dicom-parse',
  'QC' = 'qc',
  'DICOM2_NIFTI' = 'dicom2-nifti',
  'SEGMENT' = 'dicom-vessel-segment',
  'SEGMENT_EDIT' = 'vessel-segment-edit',
  'REFINE' = 'vessel-refine',
  'REFINE_EDIT' = 'vessel-refine-edit',
  'LUMEN_REFINEMENT_CL' = 'lumen-refinement-cl',
  'SZ_FFR' = 'sz-ffr',
  'CARS_GEN_THUMBNAIL' = 'cars-gen-thumbnail',
  'VALIDATE_FFR' = 'validate-ffr',
  'GEN_CPR_PLY' = 'gen-cpr-ply',
  'REPORT' = 'report',
  'RETURNED' = 'returned',
}

export enum CaseStatus {
  'WAITING_QC' = 'waiting-qc',
  'WAITING_SEGMENT' = 'waiting-rough-seg',
  'WAITING_RIFINE' = 'waiting-exact-seg',
  'WAITING_REVIEW' = 'waiting-review',
  'WAITING_REPORT' = 'waiting-report',
  'WAITING_RETURN' = 'WAITING_RETURN',
  'RETURNED' = 'RETURNED',
}
