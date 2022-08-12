import axios from 'axios';
import { v4 } from 'uuid';

import { createCaseID } from './utils';

const HOST = 'http://localhost';
const PORT = '1337';
const CREATE_CASE_PATH = '/api/cases';

const step = ['QC', 'MaskEdit', 'Review', 'Report'];

const getStep = (i: number) => {
  return step[i % 4];
};

const handleError = (error: any) => {
  console.log('Error----------------------');
  if (error.response) {
    console.log(JSON.stringify(error.response.data));
    // console.log(error.response.headers);
  } else if (error.request) {
    console.log(error.request);
  }
  console.log('Error', error.message);
};

const makeCases = () => {
  const CASE_COUNT = 1;

  const cases: any[] = [];

  const caseInfo: any = {
    uploadedAt: '2022-08-12 12:21',
    tags: ['门诊'],
    narrowDegree: 1,
    priority: 'High',
    isPositive: true,
    ffrAccessionNumber: 'asdfasd2342323',
    name: 'xxx',

    StudyDate: '20210928',
    PatientID: 'jjk443534',
    PatientSex: 'M',
    PatientAge: '18',
    PatientName: '张三',
    AccessionNumber: 'd343543jdsalkfj2',
    InstitutionName: '重庆西南医院',
    StudyInstanceUID: '3475934509438053840958324',
    PatientBirthDate: '19890216',
    Description: 'xxxxx',
  };

  for (let i = 0; i < CASE_COUNT; i += 1) {
    cases.push({
      ...caseInfo,
      caseID: createCaseID(v4()),
      workflowID: v4(),
      step: getStep(i),
      PatientName: `${caseInfo.PatientName}${i}`,
    });
  }

  return cases;
};

const createCases = async () => {
  try {
    const URI = `${HOST}:${PORT}${CREATE_CASE_PATH}`;
    const cases = makeCases();

    const createCasesBatchToBatch = async () => {
      const tasks: any[] = [];
      const MAX_TASK_COUNT = 6;

      let caseInfo;
      let number = 0;

      while (number < MAX_TASK_COUNT && (caseInfo = cases.pop())) {
        number++;
        tasks.push(
          axios.post(URI, {
            data: caseInfo,
          }),
        );
      }

      await Promise.all(tasks);
      if (cases.length) {
        await createCasesBatchToBatch();
      }
    };

    await createCasesBatchToBatch();

    console.log('Create cases success!!!');
  } catch (error) {
    handleError(error);
  }
};

createCases();
