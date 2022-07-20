### Case Schema

```ts
type Status = 'ToBeAnalyze' | 'Analysing' | 'ToBeReturn' | 'Returned';

type DVTool = 'QC' | 'Segment' | 'Refine' | 'Review' | 'ValidateFFR' | 'Report';

interface Operator {
  status: 'Pending' | 'Failed' | 'Completed';
  input: any;
  output?: any;
}

interface Base {
  uploadedAt: number;
  resultReturnedAt?: number;
  deadline: number;
  tags: string[];
  caseOrigin?: string; //病例来源，手动录入
  narrowDegree?: number; //狭窄程度
  status: Status;
  description?: string;
  isPositive: boolean; //阴阳性
  ffrAccessionNumber: string; //CTFFR检查号，手动录入
  ctaAccessionNumber: string; //CTA检查号，手动录入
  workflowID: string;
}

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

type Case = Base & {
  dicomTag: DicomTag;
};

interface Patient {
  cases: Case[];
}
```
