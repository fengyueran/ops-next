export enum NodeStep {
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

export enum CaseStatus {
  'WAITING_QC' = 'waiting-qc',
  'WAITING_SEGMENT' = 'waiting-rough-seg',
  'WAITING_RIFINE' = 'waiting-exact-seg',
  'WAITING_REVIEW' = 'waiting-review',
  'WAITING_REPORT' = 'waiting-report',
  'WAITING_RETURN' = 'waiting-return',
  'RETURNED' = 'returned',
}

export enum Priority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

export enum NodeOutput {
  'DICOM_INFO' = 'dicom_info',
  'NIFTI' = 'nifti',
  'PLY' = 'ply',
  'THUMBNAILS' = 'thumbnails',
  'TARGET_SERIES' = 'targetSeries',
  'QC_FAILED' = 'qcf',
  'SEGMENT_MASK' = 'aorta_and_arteries_comp',
  'REFINE_MASK' = 'refine_aorta_and_arteries',
  'EDITED_SEGMENT_MASK' = 'edited_aorta_and_arteries_comp',
  'EDITED_REFINE_MASK' = 'edited_refine_aorta_and_arteries',
}
