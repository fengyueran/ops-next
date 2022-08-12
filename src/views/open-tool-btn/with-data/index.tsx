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
  // fetchGzipFile,
  fetchEditOperation,
  fetchGzipAndTarFileWithCache,
  fetchGzipFileWithCache,
  uploadFile,
} from 'src/api';

interface Props {
  caseInfo: CaseInfo;
}

const findFileByName = (name: string, inputs: NodeInput[]) => {
  const found = inputs.find(({ Name }) => Name === name);
  return found;
};

const makeQCToolInput = (operation: EditOperationData, submit: QCSubmit) => {
  const inputs = operation.input;
  const getDicom = async (dicomPath: string) => {
    const fileList = await fetchGzipAndTarFileWithCache(dicomPath);
    const validFiles = (fileList as UntarFile[]).filter(({ buffer }) => buffer.byteLength > 0);
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

  return {
    getDicom,
    seriesList,
    thumbnailList,
    getAutoQCResultFile,
    submit,
  };
};

const makeMaskEditToolInput = (
  operation: EditOperationData,
  editType: MaskEditType,
  submit: SegSubmit,
) => {
  const inputs = operation.input;

  const getNifti = async () => {
    const node = findFileByName('nifti_file', inputs);
    const data = await fetchGzipFileWithCache(node?.Value!);
    return data as ArrayBuffer;
  };

  const getMask = async () => {
    const node = findFileByName('aorta_and_arteries_comp', inputs);
    const data = await fetchGzipFileWithCache(node?.Value!);
    return data as ArrayBuffer;
  };

  return {
    getNifti,
    getMask,
    editType,
    submit,
  };
};

const makeQCSubmitInput = async (data: QCToolOutput) => {
  return data;
};

const makeSegSubmitInput = async (data: SegToolOutput) => {
  const { mask } = data;
  const { path } = await uploadFile('segMask.nii.gz', mask);
  return { edited_aorta_and_arteries_comp: path };
};

const makeRefineSubmitInput = async (data: SegToolOutput) => {
  const { mask } = data;
  const { path } = await uploadFile('refineMask.nii.gz', mask);
  return { edited_refine_aorta_and_arteries: path };
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

    const dispatch = useDispatch();

    const onClick = useCallback(async () => {
      try {
        dispatch(microApp.actions.toggleMicroAppVisible(true));
        const operation = await fetchEditOperation(caseInfo.caseID);

        const submit = async (output: object, makeSubmitInput: (output: any) => Promise<any>) => {
          try {
            console.log('Submit', operation);
            const submitInput = await makeSubmitInput(output);
            await completeNode(operation.workflowID, operation.activityID, submitInput);
            dispatch(microApp.actions.toggleMicroAppVisible(false));
          } catch (error) {
            message.error(`Submit  error: ${(error as Error).message}`);
            dispatch(microApp.actions.toggleSubmitPending(false));
          }
        };

        const inputs = operation.input;

        switch (step) {
          case NodeStep.QC:
            microAppMgr.loadQCTool(
              makeQCToolInput(operation, (output) => submit(output, makeQCSubmitInput)),
            );
            break;
          case NodeStep.SEGMENT_EDIT:
            microAppMgr.loadMaskEditTool(
              makeMaskEditToolInput(operation, MaskEditType.Segment, (output) =>
                submit(output, makeSegSubmitInput),
              ),
            );
            break;
          case NodeStep.REFINE_EDIT:
            microAppMgr.loadMaskEditTool(
              makeMaskEditToolInput(operation, MaskEditType.Refine, (output) =>
                submit(output, makeRefineSubmitInput),
              ),
            );
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

    return <WrappedComponent {...(props as P)} disabled={!caseInfo.enableEdit} onClick={onClick} />;
  };
