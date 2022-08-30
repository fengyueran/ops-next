### Case Schema

```ts
type Status = 'Failed' | 'Completed' | 'Pending' | 'Running';

type Step = 'QC' | 'Segment' | 'Refine' | 'Review' | 'Report' | 'ToReturn' | 'Returned';

interface Operator {
  status: Status;
  input: any;
  output?: any;
}

type Priority = 'High' | 'Medium' | 'Low';

interface Base {
  uploadAt: number;
  returnEndAt?: number;
  tags?: string[];
  narrowDegree?: number; //狭窄程度
  status?: Status;
  step: Step;
  readed: boolean; //是否已读，默认false
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

type Case = Base & DicomTag;
```
