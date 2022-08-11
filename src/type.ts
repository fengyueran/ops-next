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

export enum CaseEditStep {
  'WAITING_QC' = 'WAITING_QC',
  'WAITING_SEGMENT' = 'WAITING_SEGMENT',
  'WAITING_RIFINE' = 'WAITING_RIFINE',
  'WAITING_REVIEW' = 'WAITING_REVIEW',
  'WAITING_REPORT' = 'WAITING_REPORT',
  'WAITING_RETURN' = 'WAITING_RETURN',
  'RETURNED' = 'RETURNED',
}
