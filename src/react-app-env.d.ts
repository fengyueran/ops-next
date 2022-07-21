/// <reference types="react-scripts" />

interface DicomTag {
  StudyInstanceUID: string;
  StudyDate: string;
  PatientID: string;
  PatientSex: string;
  PatientAge: string;
  PatientName: string;
  PatientBirthDate: string;
  InstitutionName: string;
}

interface CaseInfo {
  id: string;
  attributes: {
    workflowID: string;
    dicomTag: DicomTag;
  };
}

interface Pagination {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}

interface CaseFetchResponse {
  data: CaseInfo[];
  meta: {
    pagination: Pagination;
  };
}
