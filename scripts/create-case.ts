import axios from 'axios';
import { v4 } from 'uuid';

const HOST = 'http://localhost';
const PORT = '1337';
const CREATE_CASE_PATH = '/api/cases';

const makeCases = () => {
  const CASE_COUNT = 100;

  const cases: any[] = [];

  const caseInfo: any = {
    uploadedAt: Date.now(),
    dicomTag: {
      StudyInstanceUID: '1',
      StudyDate: '20171003',
      PatientID: '495090',
      PatientSex: 'M',
      PatientAge: '45',
      PatientName: '张三',
      PatientBirthDate: '19491003',
      InstitutionName: '重庆西南医院',
    },
  };

  for (let i = 0; i < CASE_COUNT; i += 1) {
    cases.push({
      workflowID: v4(),
      ...caseInfo,
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
          })
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
    console.error((error as Error).message);
  }
};

createCases();
