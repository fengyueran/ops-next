import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { microAppMgr, MicroApp, MaskEditType } from 'src/utils';
import {
  getDicom,
  getNifti,
  getMask,
  seriesList,
  thumbnailList,
  getPly,
  getCenterlines,
  getAutoQCResultFile,
  getPlyBuffer,
  getCenterlineBuffers,
  getCPR,
  getSphere,
  cprFilePathList,
} from 'src/mock';
import * as other from 'src/redux/other';

interface Props {
  caseInfo: CaseInfo;
}

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Props> =>
  ({ ...props }) => {
    const { caseInfo } = props;

    const dispatch = useDispatch();

    const onClick = useCallback(() => {
      dispatch(other.otherActions.toggleMicroAppVisible(true));
      const step = caseInfo.step as MicroApp;
      switch (step) {
        case MicroApp.QC:
          microAppMgr.loadQCTool({
            getDicom,
            seriesList,
            thumbnailList,
            getAutoQCResultFile,
            submit: (data: QCSubmitInput) => {
              console.log('QC Submit', data);
            },
          });

          break;
        case MicroApp.MaskEdit:
          microAppMgr.loadMaskEditTool({
            getNifti,
            getMask,
            editType: MaskEditType.Segment,
          });
          break;
        case MicroApp.Review:
          microAppMgr.loadReviewTool({
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
          });
          break;

        case MicroApp.Report:
          microAppMgr.loadReportTool({
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
          });
          break;
        default:
          throw new Error('There is no corresponding tool!');
      }
    }, [dispatch, caseInfo]);

    return <WrappedComponent {...(props as P)} toolName={caseInfo.step} onClick={onClick} />;
  };
