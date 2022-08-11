import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { message } from 'antd';

import { microAppMgr, MaskEditType } from 'src/utils';
import {
  // getDicom,
  getNifti,
  getMask,
  // seriesList,
  // thumbnailList,
  getPly,
  getCenterlines,
  // getAutoQCResultFile,
  getPlyBuffer,
  getCenterlineBuffers,
  getCPR,
  getSphere,
  cprFilePathList,
} from 'src/mock';
import { microApp } from 'src/redux';
import { NodeStep } from 'src/type';
import {
  fetchFile,
  // uploadFile,
  fullPath,
  completeNode,
  fetchEditOperation,
  fetchCompressedFileWithCache,
} from 'src/api';

interface Props {
  caseInfo: CaseInfo;
}

const CanEditSteps = [
  NodeStep.QC,
  NodeStep.SEGMENT_EDIT,
  NodeStep.REFINE_EDIT,
  NodeStep.VALIDATE_FFR,
  NodeStep.REPORT,
];

const findFileByName = (name: string, inputs: NodeInput[]) => {
  const found = inputs.find(({ Name }) => Name === name);
  return found;
};

const makeQCToolInput = (
  data: EditOperationFetchResponse,
  submitCallback: (res: [data: any, error?: Error]) => void,
) => {
  const inputs = data.input;
  const getDicom = async (dicomPath: string) => {
    const fileList: UntarFile[] = await fetchCompressedFileWithCache(dicomPath);
    const validFiles = fileList.filter(({ buffer }) => buffer.byteLength > 0);
    const bufferList = validFiles.map(({ buffer }) => buffer);

    return bufferList;
  };

  const getAutoQCResultFile = async () => {
    const node = findFileByName('dicom_info', inputs);
    const data = await fetchFile(node?.Value!);
    return data as AutoQCInfo;
  };

  const seriesList = JSON.parse(findFileByName('series', inputs)?.Value!);
  const thumbnailList = JSON.parse(findFileByName('thumbnails', inputs)?.Value!).map(
    (thumbPath: string) => fullPath(thumbPath),
  );

  const submit = async (submitInput: QCSubmitInput) => {
    try {
      console.log('QC Submit', data);
      await completeNode(data.workflowID, data.activityID, submitInput);
      submitCallback(['success']);
    } catch (error) {
      submitCallback(['error', error as Error]);
    }
  };

  return {
    getDicom,
    seriesList,
    thumbnailList,
    getAutoQCResultFile,
    submit,
  };
};

const makeMaskEditToolInput = (inputs: NodeInput[], editType: MaskEditType) => {
  return {
    getNifti,
    getMask,
    editType,
  };
};

const makeReivewToolInput = (inputs: NodeInput[], caseInfo: CaseInfo) => {
  return {
    caseInfo: {
      PatientName: caseInfo.PatientName!,
      PatientSex: caseInfo.PatientSex!,
      PatientAge: caseInfo.PatientAge!,
      PatientID: caseInfo.PatientID!,
      StudyDate: caseInfo.StudyDate!,
      AccessionNumber: caseInfo.AccessionNumber,
    },
    getNifti,
    getMask,
    getPly,
    getCenterlines,
  };
};

const makeReportToolInput = (inputs: NodeInput[]) => {
  return {
    caseInfo: {
      caseId: 'HT-HFDK8G',
      reportId: 'HT-HFDK8G',
      id: 'PatientID',
      checkDate: '09/09/2020',
      reportDate: '09/09/2020',
      patientName: '张三',
      gender: 'M',
      age: '17',
      hospital: '重庆西南医院',
    },
    getPly: getPlyBuffer,
    getCPR,
    getSphere,
    getCenterlines: getCenterlineBuffers,
    cprFilePathList,
  };
};

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Props> =>
  ({ ...props }) => {
    const { caseInfo } = props;
    const step: NodeStep = caseInfo.step;
    const canEdit = CanEditSteps.find((s) => s === step);

    const dispatch = useDispatch();

    const onClick = useCallback(async () => {
      try {
        dispatch(microApp.actions.toggleMicroAppVisible(true));
        const res = await fetchEditOperation(caseInfo.caseID);
        const inputs = res.input;

        const submitCallback = (res: [data: any, error?: Error]) => {
          const [, error] = res;
          if (error) {
            message.error(`Submit  error: ${(error as Error).message}`);
            dispatch(microApp.actions.toggleSubmitPending(false));
          } else {
            dispatch(microApp.actions.toggleMicroAppVisible(false));
          }
        };

        switch (step) {
          case NodeStep.QC:
            microAppMgr.loadQCTool(makeQCToolInput(res, submitCallback));
            break;
          case NodeStep.SEGMENT_EDIT:
            microAppMgr.loadMaskEditTool(makeMaskEditToolInput(inputs, MaskEditType.Segment));
            break;
          case NodeStep.REFINE_EDIT:
            microAppMgr.loadMaskEditTool(makeMaskEditToolInput(inputs, MaskEditType.Refine));
            break;
          case NodeStep.VALIDATE_FFR:
            microAppMgr.loadReviewTool(makeReivewToolInput(inputs, caseInfo));
            break;
          case NodeStep.REPORT:
            microAppMgr.loadReportTool(makeReportToolInput(inputs));
            break;
          default:
            throw new Error('There is no corresponding tool!');
        }
      } catch (error) {
        message.error(`Load1 error: ${(error as Error).message}`);
      }
    }, [dispatch, step, caseInfo]);

    return <WrappedComponent {...(props as P)} disabled={!canEdit} onClick={onClick} />;
  };
